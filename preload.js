const { contextBridge, ipcRenderer } = require("electron");

// 预加载层是安全边界：渲染层只能访问这里显式开放的终端能力。

// 通过预加载脚本暴露最小终端 API，避免渲染层直接接触 Electron 能力。
contextBridge.exposeInMainWorld("terminalApi", {
  sendInput(data) {
    // 渲染层不会直接接触 node-pty，所有输入都通过 IPC 转发。
    ipcRenderer.send("terminal:input", data);
  },
  resize(cols, rows) {
    // xterm.js 计算出的字符网格尺寸需要同步给真实 shell。
    ipcRenderer.send("terminal:resize", { cols, rows });
  },
  onData(listener) {
    // 包装一层 handler，便于后续按相同引用解除订阅。
    const handler = (_, data) => listener(data);
    ipcRenderer.on("terminal:data", handler);
    return () => ipcRenderer.removeListener("terminal:data", handler);
  },
  onExit(listener) {
    // 单独监听退出消息，后续扩展状态提示或重连逻辑会更清晰。
    const handler = (_, message) => listener(message);
    ipcRenderer.on("terminal:exit", handler);
    return () => ipcRenderer.removeListener("terminal:exit", handler);
  },
  minimizeWindow() {
    // 窗口控制能力也通过 preload 暴露，避免直接暴露 Electron 对象。
    ipcRenderer.send("window:minimize");
  },
  closeWindow() {
    ipcRenderer.send("window:close");
  },
  setMousePassthrough(ignore) {
    ipcRenderer.send("window:set-ignore-mouse", ignore);
  }
});
