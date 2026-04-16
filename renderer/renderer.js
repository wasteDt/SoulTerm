const terminalElement = document.getElementById("terminal");
const terminalViewElement = document.getElementById("terminalView");
const terminalNativeElement = document.getElementById("terminalNative");
const terminalInputProxyElement = document.getElementById("terminalInputProxy");
const themeToggleButton = document.getElementById("themeToggle");
const passthroughToggleButton = document.getElementById("passthroughToggle");
const minimizeButton = document.getElementById("minimizeButton");
const closeButton = document.getElementById("closeButton");
const dragHandleElement = document.querySelector(".drag-handle");

const themes = {
  glass: {
    buttonLabel: "玻璃模式",
    terminal: {
      background: "rgba(0, 0, 0, 0)",
      foreground: "#d5def5",
      cursor: "#7dd3fc",
      black: "#0f172a",
      red: "#f87171",
      green: "#4ade80",
      yellow: "#facc15",
      blue: "#60a5fa",
      magenta: "#f472b6",
      cyan: "#22d3ee",
      white: "#e2e8f0",
      brightBlack: "#475569",
      brightRed: "#fb7185",
      brightGreen: "#86efac",
      brightYellow: "#fde047",
      brightBlue: "#93c5fd",
      brightMagenta: "#f9a8d4",
      brightCyan: "#67e8f9",
      brightWhite: "#f8fafc"
    }
  },
  clear: {
    buttonLabel: "透明模式",
    terminal: {
      background: "rgba(0, 0, 0, 0)",
      foreground: "#dbeafe",
      cursor: "#a5f3fc",
      black: "#020617",
      red: "#fca5a5",
      green: "#86efac",
      yellow: "#fde68a",
      blue: "#93c5fd",
      magenta: "#f5d0fe",
      cyan: "#a5f3fc",
      white: "#e0f2fe",
      brightBlack: "#64748b",
      brightRed: "#fecaca",
      brightGreen: "#bbf7d0",
      brightYellow: "#fef3c7",
      brightBlue: "#bfdbfe",
      brightMagenta: "#fae8ff",
      brightCyan: "#cffafe",
      brightWhite: "#f8fafc"
    }
  }
};

let currentTheme = "clear";
let pendingResizeFrame = null;
let pendingViewFrame = null;
let isComposing = false;
let isMousePassthrough = false;
let isPassthroughEnabled = true;

// xterm.js 只作为隐藏的终端状态机保留，真正显示内容的是自定义视图层。
const terminal = new Terminal({
  allowTransparency: true,
  cursorBlink: true,
  fontFamily: '"Cascadia Code", "Consolas", monospace',
  fontSize: 15,
  lineHeight: 1.25,
  scrollback: 5000,
  theme: themes.clear.terminal
});

const fitAddon = new FitAddon.FitAddon();
terminal.loadAddon(fitAddon);
terminal.open(terminalNativeElement);

function resizeTerminal() {
  if (!terminalElement.isConnected) {
    return;
  }

  fitAddon.fit();

  if (terminal.cols > 0 && terminal.rows > 0) {
    window.terminalApi.resize(terminal.cols, terminal.rows);
  }

  scheduleViewRender();
}

function scheduleResize() {
  if (pendingResizeFrame !== null) {
    cancelAnimationFrame(pendingResizeFrame);
  }

  pendingResizeFrame = requestAnimationFrame(() => {
    pendingResizeFrame = null;
    resizeTerminal();
  });
}

function scheduleViewRender() {
  if (pendingViewFrame !== null) {
    cancelAnimationFrame(pendingViewFrame);
  }

  pendingViewFrame = requestAnimationFrame(() => {
    pendingViewFrame = null;
    renderTerminalView();
  });
}

function renderTerminalView() {
  const buffer = terminal.buffer.active;

  if (!buffer || terminal.rows <= 0) {
    terminalViewElement.replaceChildren();
    return;
  }

  const fragment = document.createDocumentFragment();
  const totalLines = buffer.length;
  const cursorRow = buffer.baseY + buffer.cursorY;
  const cursorColumn = buffer.cursorX;
  for (let row = 0; row < totalLines; row += 1) {
    const bufferLine = buffer.getLine(row);

    if (!bufferLine) {
      continue;
    }

    const text = bufferLine.translateToString(true);

    if (!text && row !== cursorRow) {
      continue;
    }

    const lineElement = document.createElement("div");
    lineElement.className = "terminal-view-line";

    if (row === cursorRow) {
      lineElement.classList.add("terminal-view-line-current");
    }

    if (!text.trim()) {
      lineElement.classList.add("terminal-view-line-faint");
    }

    if (row === cursorRow) {
      const beforeCursor = text.slice(0, cursorColumn);
      const cursorCharacter = text[cursorColumn] || " ";
      const afterCursor = text.slice(cursorColumn + (text[cursorColumn] ? 1 : 0));

      const beforeNode = document.createElement("span");
      beforeNode.textContent = beforeCursor;

      const cursorNode = document.createElement("span");
      cursorNode.className = "terminal-view-cursor";
      cursorNode.textContent = cursorCharacter;

      const afterNode = document.createElement("span");
      afterNode.textContent = afterCursor;

      lineElement.append(beforeNode, cursorNode, afterNode);
    } else {
      lineElement.textContent = text || " ";
    }

    fragment.appendChild(lineElement);
  }

  terminalViewElement.replaceChildren(fragment);
  const activeLine = terminalViewElement.querySelector(".terminal-view-line-current");

  if (activeLine) {
    activeLine.scrollIntoView({ block: "nearest" });
  }

  updateInputProxyPosition();
}

function applyTheme(themeName) {
  const nextTheme = themes[themeName];

  if (!nextTheme) {
    return;
  }

  currentTheme = themeName;

  if (themeName === "glass") {
    delete document.body.dataset.theme;
  } else {
    document.body.dataset.theme = themeName;
  }

  themeToggleButton.textContent = nextTheme.buttonLabel;
  terminal.options.theme = nextTheme.terminal;
  applyPassthroughMode(themeName === "clear");
  scheduleResize();
}

function toControlCharacter(key) {
  if (key.length !== 1) {
    return null;
  }

  const lower = key.toLowerCase();
  const code = lower.charCodeAt(0);

  if (code >= 97 && code <= 122) {
    return String.fromCharCode(code - 96);
  }

  if (lower === " ") {
    return "\0";
  }

  if (lower === "[") {
    return "\u001b";
  }

  if (lower === "\\") {
    return "\u001c";
  }

  if (lower === "]") {
    return "\u001d";
  }

  return null;
}

function mapKeyToInput(event) {
  if (event.ctrlKey && !event.altKey && !event.metaKey) {
    if (event.key.toLowerCase() === "v") {
      // 交给 paste 事件或浏览器默认行为处理。
      return null;
    }

    return toControlCharacter(event.key);
  }

  const specialKeys = {
    Enter: "\r",
    Backspace: "\u007f",
    Tab: "\t",
    Escape: "\u001b",
    ArrowUp: "\u001b[A",
    ArrowDown: "\u001b[B",
    ArrowRight: "\u001b[C",
    ArrowLeft: "\u001b[D",
    Delete: "\u001b[3~",
    Home: "\u001b[H",
    End: "\u001b[F",
    PageUp: "\u001b[5~",
    PageDown: "\u001b[6~"
  };

  if (specialKeys[event.key]) {
    return specialKeys[event.key];
  }

  // 普通文本输入和输入法组合输入统一交给隐藏输入框处理。
  if (event.key.length === 1 && !event.metaKey) {
    return null;
  }

  return null;
}

function focusTerminalView() {
  terminalInputProxyElement.focus();
}

function getScrollbarThickness(element) {
  return Math.max(0, element.offsetWidth - element.clientWidth);
}

function isPointerOnScrollbar(event, element) {
  if (!element || element.scrollHeight <= element.clientHeight) {
    return false;
  }

  const scrollbarThickness = getScrollbarThickness(element);

  if (scrollbarThickness <= 0) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return event.clientX >= rect.right - scrollbarThickness;
}

function isInteractiveTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      ".titlebar-button, .drag-handle, .terminal-view-line, .terminal-input-proxy"
    )
  );
}

function setMousePassthrough(ignore) {
  if (isMousePassthrough === ignore) {
    return;
  }

  isMousePassthrough = ignore;
  window.terminalApi.setMousePassthrough(ignore);
}

function updatePassthroughToggleLabel() {
  passthroughToggleButton.textContent = `穿透：${isPassthroughEnabled ? "开" : "关"}`;
}

function applyPassthroughMode(enabled) {
  isPassthroughEnabled = enabled;
  updatePassthroughToggleLabel();

  if (!enabled) {
    setMousePassthrough(false);
  }
}

function updateMousePassthrough(event) {
  if (!isPassthroughEnabled) {
    setMousePassthrough(false);
    return;
  }

  const target = document.elementFromPoint(event.clientX, event.clientY);
  const shouldCaptureMouse =
    isInteractiveTarget(target) || isPointerOnScrollbar(event, terminalViewElement);

  setMousePassthrough(!shouldCaptureMouse);
}

function captureMouseForDragHandle() {
  if (!isPassthroughEnabled) {
    return;
  }

  setMousePassthrough(false);
}

function updateInputProxyPosition() {
  const currentLineElement = terminalViewElement.querySelector(".terminal-view-line-current");
  const cursorElement = terminalViewElement.querySelector(".terminal-view-cursor");

  if (!currentLineElement || !cursorElement) {
    return;
  }

  const terminalRect = terminalElement.getBoundingClientRect();
  const cursorRect = cursorElement.getBoundingClientRect();
  const gap = 6;
  const proxyHeight = Math.max(24, Math.round(cursorRect.height));
  const spaceBelow = terminalRect.bottom - cursorRect.bottom;

  const top =
    spaceBelow >= proxyHeight + gap
      ? cursorRect.bottom - terminalRect.top + gap
      : cursorRect.top - terminalRect.top - proxyHeight - gap;

  terminalInputProxyElement.style.left = `${Math.max(0, cursorRect.left - terminalRect.left)}px`;
  terminalInputProxyElement.style.top = `${Math.max(0, top)}px`;
  terminalInputProxyElement.style.height = `${proxyHeight}px`;
}

function flushProxyValue() {
  const value = terminalInputProxyElement.value;

  if (!value) {
    return;
  }

  terminalInputProxyElement.value = "";
  window.terminalApi.sendInput(value);
}

function handlePaste(event) {
  const text = event.clipboardData?.getData("text");

  if (!text) {
    return;
  }

  event.preventDefault();
  terminalInputProxyElement.value = "";
  window.terminalApi.sendInput(text.replace(/\r?\n/g, "\r"));
}

const resizeObserver = new ResizeObserver(() => {
  scheduleResize();
});

resizeObserver.observe(document.body);
resizeObserver.observe(terminalElement);

terminalViewElement.addEventListener("mousedown", (event) => {
  event.preventDefault();
  focusTerminalView();
});

if (dragHandleElement) {
  dragHandleElement.addEventListener("mouseenter", captureMouseForDragHandle);
  dragHandleElement.addEventListener("mousedown", captureMouseForDragHandle);
}

window.addEventListener("mousemove", updateMousePassthrough, { passive: true, capture: true });
window.addEventListener("mouseleave", () => {
  setMousePassthrough(false);
});

terminalInputProxyElement.addEventListener("keydown", (event) => {
  const input = mapKeyToInput(event);

  if (!input) {
    return;
  }

  event.preventDefault();
  window.terminalApi.sendInput(input);
});

terminalInputProxyElement.addEventListener("input", () => {
  if (isComposing) {
    return;
  }

  flushProxyValue();
});

terminalInputProxyElement.addEventListener("compositionstart", () => {
  isComposing = true;
});

terminalInputProxyElement.addEventListener("compositionend", () => {
  isComposing = false;
  flushProxyValue();
});

terminalInputProxyElement.addEventListener("paste", handlePaste);

scheduleResize();
focusTerminalView();
applyTheme(currentTheme);

terminal.onRender(() => {
  scheduleViewRender();
});

terminal.onScroll(() => {
  scheduleViewRender();
});

const disposeData = window.terminalApi.onData((data) => {
  terminal.write(data);
  scheduleViewRender();
});

const disposeExit = window.terminalApi.onExit((message) => {
  terminal.write(message);
  scheduleViewRender();
});

themeToggleButton.addEventListener("click", () => {
  applyTheme(currentTheme === "glass" ? "clear" : "glass");
});

passthroughToggleButton.addEventListener("click", () => {
  applyPassthroughMode(!isPassthroughEnabled);
});

minimizeButton.addEventListener("click", () => {
  window.terminalApi.minimizeWindow();
});

closeButton.addEventListener("click", () => {
  window.terminalApi.closeWindow();
});

window.addEventListener("resize", scheduleResize);
window.addEventListener("focus", focusTerminalView);
window.addEventListener("beforeunload", () => {
  window.removeEventListener("resize", scheduleResize);
  window.removeEventListener("focus", focusTerminalView);
  window.removeEventListener("mousemove", updateMousePassthrough, {
    capture: true
  });
  resizeObserver.disconnect();

  if (pendingResizeFrame !== null) {
    cancelAnimationFrame(pendingResizeFrame);
  }

  if (pendingViewFrame !== null) {
    cancelAnimationFrame(pendingViewFrame);
  }

  disposeData();
  disposeExit();
  setMousePassthrough(false);
  terminal.dispose();
});

setTimeout(scheduleResize, 50);
