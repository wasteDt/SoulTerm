const fs = require("fs");
const path = require("path");
const { app, BrowserWindow, ipcMain } = require("electron");
const pty = require("node-pty");

// 通过 webContents.id 为每个渲染窗口维护一个独立的 PTY 实例。
const terminals = new Map();
const launchCwd = resolveLaunchCwd();
const windowStatePath = path.join(app.getPath("userData"), "window-state.json");
const defaultWindowBounds = {
  width: 1280,
  height: 820
};

function getWindowByWebContentsId(webContentsId) {
  return BrowserWindow.getAllWindows().find(
    (window) => window.webContents.id === webContentsId
  );
}

function sendToWindow(window, channel, payload) {
  if (!window || window.isDestroyed() || window.webContents.isDestroyed()) {
    return;
  }

  try {
    window.webContents.send(channel, payload);
  } catch (error) {
    console.error(`[window:${channel}]`, error);
  }
}

function getShellConfig() {
  if (process.platform === "win32") {
    // Windows 下复用系统 shell，只有非 cmd 时才附带 -NoLogo。
    const shell = process.env.COMSPEC || "powershell.exe";

    return {
      shell,
      args: shell.toLowerCase().includes("cmd.exe") ? [] : ["-NoLogo"]
    };
  }

  return {
    shell: process.env.SHELL || "/bin/bash",
    args: []
  };
}

function resolveLaunchCwd() {
  // 允许通过环境变量覆盖终端启动时的初始工作目录。
  const candidate = process.env.SOULTERM_CWD;

  if (candidate && path.isAbsolute(candidate)) {
    return candidate;
  }

  return app.getPath("home");
}

function readWindowState() {
  try {
    if (!fs.existsSync(windowStatePath)) {
      return defaultWindowBounds;
    }

    const raw = fs.readFileSync(windowStatePath, "utf8");
    const parsed = JSON.parse(raw);

    if (!isValidWindowState(parsed)) {
      return defaultWindowBounds;
    }

    return parsed;
  } catch (error) {
    console.error("[window-state:read]", error);
    return defaultWindowBounds;
  }
}

function isValidWindowState(state) {
  if (!state || typeof state !== "object") {
    return false;
  }

  const requiredNumbers = ["width", "height"];

  return requiredNumbers.every((key) => Number.isFinite(state[key]));
}

function saveWindowState(window) {
  if (!window || window.isDestroyed() || window.isMinimized()) {
    return;
  }

  const bounds = window.getBounds();
  const payload = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height
  };

  try {
    fs.writeFileSync(windowStatePath, JSON.stringify(payload, null, 2), "utf8");
  } catch (error) {
    console.error("[window-state:write]", error);
  }
}

function createTerminal(webContentsId) {
  const shellConfig = getShellConfig();
  const ptyOptions = {
    name: "xterm-256color",
    cols: 120,
    rows: 32,
    cwd: launchCwd,
    env: {
      ...process.env,
      TERM: "xterm-256color"
    }
  };

  if (process.platform === "win32") {
    // Electron 在 Windows 下以 GUI 进程运行，某些环境里 ConPTY 可能附着失败。
    // 这里回退到 winpty 以保证启动更稳定。
    ptyOptions.useConpty = false;
  }

  const term = pty.spawn(shellConfig.shell, shellConfig.args, ptyOptions);

  terminals.set(webContentsId, term);

  term.onData((data) => {
    // 把 PTY 输出转发回对应的渲染进程，由 xterm.js 负责绘制。
    const window = getWindowByWebContentsId(webContentsId);
    sendToWindow(window, "terminal:data", data);
  });

  term.onExit(({ exitCode }) => {
    const window = getWindowByWebContentsId(webContentsId);

    terminals.delete(webContentsId);
    sendToWindow(
      window,
      "terminal:exit",
      `\r\n\n[terminal exited with code ${exitCode}]`
    );
  });
}

function disposeTerminal(webContentsId) {
  const term = terminals.get(webContentsId);

  if (!term) {
    return;
  }

  terminals.delete(webContentsId);

  try {
    // 窗口关闭时销毁 PTY，避免留下孤立的 shell 进程。
    term.kill();
  } catch (error) {
    console.error("[terminal:kill]", error);
  }
}

function createWindow() {
  const windowState = readWindowState();
  const window = new BrowserWindow({
    ...defaultWindowBounds,
    ...windowState,
    minWidth: 520,
    minHeight: 360,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    autoHideMenuBar: true,
    title: "SoulTerm",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      // 渲染层只能通过 preload 暴露的 API 与 Electron 交互。
      nodeIntegration: false
    }
  });

  // 使用更高一级的置顶层级，确保窗口保持在普通应用之上。
  window.setAlwaysOnTop(true, "screen-saver");
  window.loadFile(path.join(__dirname, "renderer", "index.html"));

  window.on("resize", () => {
    saveWindowState(window);
  });

  window.on("move", () => {
    saveWindowState(window);
  });

  window.webContents.once("did-finish-load", () => {
    // 页面准备完成后再创建终端，确保前端监听器已经挂好。
    createTerminal(window.webContents.id);
  });

  window.on("close", () => {
    saveWindowState(window);
    disposeTerminal(window.webContents.id);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.on("terminal:input", (event, data) => {
  const term = terminals.get(event.sender.id);

  if (term) {
    // 将 xterm 输入按字节流写入后端 PTY。
    term.write(data);
  }
});

ipcMain.on("terminal:resize", (event, size) => {
  const term = terminals.get(event.sender.id);

  if (term && size.cols > 0 && size.rows > 0) {
    // 保持 PTY 网格尺寸与前端一致，避免换行错位。
    term.resize(size.cols, size.rows);
  }
});

ipcMain.on("window:minimize", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);

  if (window && !window.isDestroyed()) {
    window.minimize();
  }
});

ipcMain.on("window:close", (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);

  if (window && !window.isDestroyed()) {
    window.close();
  }
});

ipcMain.on("window:set-ignore-mouse", (event, ignore) => {
  const window = BrowserWindow.fromWebContents(event.sender);

  if (!window || window.isDestroyed()) {
    return;
  }

  window.setIgnoreMouseEvents(Boolean(ignore), { forward: true });
});

process.on("uncaughtException", (error) => {
  console.error("[uncaughtException]", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
