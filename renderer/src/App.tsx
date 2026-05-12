import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent
} from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";

type ThemeName = "glass" | "clear";

type ThemeConfig = {
  buttonLabel: string;
  terminal: NonNullable<Terminal["options"]["theme"]>;
};

type RenderedLine = {
  key: string;
  text: string;
  isCurrent: boolean;
  isFaint: boolean;
  beforeCursor?: string;
  cursorCharacter?: string;
  afterCursor?: string;
};

const themes: Record<ThemeName, ThemeConfig> = {
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

function toControlCharacter(key: string) {
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

function mapKeyToInput(event: KeyboardEvent) {
  if (event.ctrlKey && !event.altKey && !event.metaKey) {
    if (event.key.toLowerCase() === "v") {
      return null;
    }

    return toControlCharacter(event.key);
  }

  const specialKeys: Record<string, string> = {
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

  if (event.key.length === 1 && !event.metaKey) {
    return null;
  }

  return null;
}

function getScrollbarThickness(element: HTMLElement) {
  return Math.max(0, element.offsetWidth - element.clientWidth);
}

function isPointerOnScrollbar(event: MouseEvent, element: HTMLElement | null) {
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

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      ".titlebar-button, .drag-handle, .terminal-view-line, .terminal-input-proxy"
    )
  );
}

function buildRenderedLines(terminal: Terminal): RenderedLine[] {
  const buffer = terminal.buffer.active;

  if (!buffer || terminal.rows <= 0) {
    return [];
  }

  const totalLines = buffer.length;
  const cursorRow = buffer.baseY + buffer.cursorY;
  const cursorColumn = buffer.cursorX;
  const nextLines: RenderedLine[] = [];

  for (let row = 0; row < totalLines; row += 1) {
    const bufferLine = buffer.getLine(row);

    if (!bufferLine) {
      continue;
    }

    const text = bufferLine.translateToString(true);

    if (!text && row !== cursorRow) {
      continue;
    }

    if (row === cursorRow) {
      const cursorCharacter = text[cursorColumn] || " ";

      nextLines.push({
        key: `line-${row}`,
        text,
        isCurrent: true,
        isFaint: !text.trim(),
        beforeCursor: text.slice(0, cursorColumn),
        cursorCharacter,
        afterCursor: text.slice(cursorColumn + (text[cursorColumn] ? 1 : 0))
      });
      continue;
    }

    nextLines.push({
      key: `line-${row}`,
      text,
      isCurrent: false,
      isFaint: !text.trim()
    });
  }

  return nextLines;
}

export default function App() {
  const terminalElementRef = useRef<HTMLDivElement | null>(null);
  const terminalViewRef = useRef<HTMLDivElement | null>(null);
  const terminalNativeRef = useRef<HTMLDivElement | null>(null);
  const terminalInputProxyRef = useRef<HTMLTextAreaElement | null>(null);
  const dragHandleRef = useRef<HTMLButtonElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const pendingResizeFrameRef = useRef<number | null>(null);
  const pendingViewFrameRef = useRef<number | null>(null);
  const isComposingRef = useRef(false);
  const isMousePassthroughRef = useRef(false);
  const isPassthroughEnabledRef = useRef(true);
  const suppressTerminalFocusRef = useRef(false);
  const leaveHandlerRef = useRef<(() => void) | null>(null);

  const [themeName, setThemeName] = useState<ThemeName>("clear");
  const [isPassthroughEnabled, setIsPassthroughEnabled] = useState(true);
  const [lines, setLines] = useState<RenderedLine[]>([]);

  useEffect(() => {
    isPassthroughEnabledRef.current = isPassthroughEnabled;
  }, [isPassthroughEnabled]);

  useEffect(() => {
    if (themeName === "glass") {
      delete document.body.dataset.theme;
    } else {
      document.body.dataset.theme = themeName;
    }
  }, [themeName]);

  useLayoutEffect(() => {
    const terminalNativeElement = terminalNativeRef.current;
    const terminalElement = terminalElementRef.current;

    if (!terminalNativeElement || !terminalElement) {
      return;
    }

    const terminal = new Terminal({
      allowTransparency: true,
      cursorBlink: true,
      fontFamily: '"Cascadia Code", "Consolas", monospace',
      fontSize: 15,
      lineHeight: 1.25,
      scrollback: 5000,
      theme: themes.clear.terminal
    });
    const fitAddon = new FitAddon();

    terminalRef.current = terminal;
    terminal.loadAddon(fitAddon);
    terminal.open(terminalNativeElement);

    const scheduleViewRender = () => {
      if (pendingViewFrameRef.current !== null) {
        cancelAnimationFrame(pendingViewFrameRef.current);
      }

      pendingViewFrameRef.current = window.requestAnimationFrame(() => {
        pendingViewFrameRef.current = null;
        setLines(buildRenderedLines(terminal));
      });
    };

    const resizeTerminal = () => {
      if (!terminalElement.isConnected) {
        return;
      }

      fitAddon.fit();

      if (terminal.cols > 0 && terminal.rows > 0) {
        window.terminalApi.resize(terminal.cols, terminal.rows);
      }

      scheduleViewRender();
    };

    const scheduleResize = () => {
      if (pendingResizeFrameRef.current !== null) {
        cancelAnimationFrame(pendingResizeFrameRef.current);
      }

      pendingResizeFrameRef.current = window.requestAnimationFrame(() => {
        pendingResizeFrameRef.current = null;
        resizeTerminal();
      });
    };

    const focusTerminalView = () => {
      if (suppressTerminalFocusRef.current) {
        return;
      }

      terminalInputProxyRef.current?.focus();
    };

    const setMousePassthrough = (ignore: boolean) => {
      if (isMousePassthroughRef.current === ignore) {
        return;
      }

      isMousePassthroughRef.current = ignore;
      window.terminalApi.setMousePassthrough(ignore);
    };

    const updateMousePassthrough = (event: MouseEvent) => {
      if (!isPassthroughEnabledRef.current) {
        setMousePassthrough(false);
        return;
      }

      const target = document.elementFromPoint(event.clientX, event.clientY);
      const shouldCaptureMouse =
        isInteractiveTarget(target) ||
        isPointerOnScrollbar(event, terminalViewRef.current);

      setMousePassthrough(!shouldCaptureMouse);
    };

    const captureMouseForDragHandle = () => {
      suppressTerminalFocusRef.current = true;
      terminalInputProxyRef.current?.blur();

      if (!isPassthroughEnabledRef.current) {
        return;
      }

      setMousePassthrough(false);
    };

    const releaseTerminalFocusLock = () => {
      suppressTerminalFocusRef.current = false;
    };

    const handleWindowFocus = () => {
      focusTerminalView();
    };

    const resizeObserver = new ResizeObserver(() => {
      scheduleResize();
    });

    resizeObserver.observe(document.body);
    resizeObserver.observe(terminalElement);

    const disposeRender = terminal.onRender(() => {
      scheduleViewRender();
    });
    const disposeScroll = terminal.onScroll(() => {
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
    const leaveHandler = () => {
      setMousePassthrough(false);
    };

    leaveHandlerRef.current = leaveHandler;
    dragHandleRef.current?.addEventListener("mouseenter", captureMouseForDragHandle);
    dragHandleRef.current?.addEventListener("mousedown", captureMouseForDragHandle);
    window.addEventListener("mouseup", releaseTerminalFocusLock, true);
    window.addEventListener("blur", releaseTerminalFocusLock);
    window.addEventListener("mousemove", updateMousePassthrough, {
      passive: true,
      capture: true
    });
    window.addEventListener("mouseleave", leaveHandler);
    window.addEventListener("resize", scheduleResize);
    window.addEventListener("focus", handleWindowFocus);

    scheduleResize();
    focusTerminalView();

    const timeoutId = window.setTimeout(scheduleResize, 50);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", scheduleResize);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("mousemove", updateMousePassthrough, true);

      if (leaveHandlerRef.current) {
        window.removeEventListener("mouseleave", leaveHandlerRef.current);
      }

      dragHandleRef.current?.removeEventListener("mouseenter", captureMouseForDragHandle);
      dragHandleRef.current?.removeEventListener("mousedown", captureMouseForDragHandle);
      window.removeEventListener("mouseup", releaseTerminalFocusLock, true);
      window.removeEventListener("blur", releaseTerminalFocusLock);
      resizeObserver.disconnect();
      disposeRender.dispose();
      disposeScroll.dispose();
      disposeData();
      disposeExit();

      if (pendingResizeFrameRef.current !== null) {
        cancelAnimationFrame(pendingResizeFrameRef.current);
      }

      if (pendingViewFrameRef.current !== null) {
        cancelAnimationFrame(pendingViewFrameRef.current);
      }

      setMousePassthrough(false);
      terminal.dispose();
      terminalRef.current = null;
    };
  }, []);

  useEffect(() => {
    const terminal = terminalRef.current;

    if (!terminal) {
      return;
    }

    terminal.options.theme = themes[themeName].terminal;
    setIsPassthroughEnabled(themeName === "clear");
    window.terminalApi.setMousePassthrough(false);
  }, [themeName]);

  useLayoutEffect(() => {
    const terminalView = terminalViewRef.current;
    const terminalElement = terminalElementRef.current;
    const terminalInputProxy = terminalInputProxyRef.current;

    if (!terminalView || !terminalElement || !terminalInputProxy) {
      return;
    }

    const activeLine = terminalView.querySelector<HTMLElement>(".terminal-view-line-current");

    if (activeLine) {
      activeLine.scrollIntoView({ block: "nearest" });
    }

    const cursorElement = terminalView.querySelector<HTMLElement>(".terminal-view-cursor");

    if (!activeLine || !cursorElement) {
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

    terminalInputProxy.style.left = `${Math.max(0, cursorRect.left - terminalRect.left)}px`;
    terminalInputProxy.style.top = `${Math.max(0, top)}px`;
    terminalInputProxy.style.height = `${proxyHeight}px`;
  }, [lines]);

  const focusTerminalView = () => {
    terminalInputProxyRef.current?.focus();
  };

  const flushProxyValue = () => {
    const proxy = terminalInputProxyRef.current;

    if (!proxy || !proxy.value) {
      return;
    }

    const value = proxy.value;

    proxy.value = "";
    window.terminalApi.sendInput(value);
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const text = event.clipboardData.getData("text");

    if (!text) {
      return;
    }

    event.preventDefault();

    if (terminalInputProxyRef.current) {
      terminalInputProxyRef.current.value = "";
    }

    window.terminalApi.sendInput(text.replace(/\r?\n/g, "\r"));
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    const input = mapKeyToInput(event.nativeEvent);

    if (!input) {
      return;
    }

    event.preventDefault();
    window.terminalApi.sendInput(input);
  };

  return (
    <div className="app-shell">
      <header className="titlebar">
        <div className="titlebar-copy">
          <p className="eyebrow">SoulTerm</p>
          <h1>SoulTerm</h1>
        </div>
        <div className="titlebar-actions">
          <button
            ref={dragHandleRef}
            className="drag-handle"
            type="button"
            tabIndex={-1}
            aria-label="拖动窗口"
            title="按住这里拖动窗口"
          >
            <span className="drag-handle-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M12 2.5 15 5.7 13 5.8V10h4.2l.1-2 3.2 3-3.2 3-.1-2H13v4.2l2 .1-3 3.2-3-3.2 2-.1V12H6.8l-.1 2-3.2-3 3.2-3 .1 2H11V5.8l-2-.1 3-3.2Z" />
              </svg>
            </span>
            <span className="drag-handle-label">拖动</span>
          </button>
          <button
            className="titlebar-button titlebar-button-theme"
            type="button"
            onClick={() => {
              setThemeName((currentTheme) =>
                currentTheme === "glass" ? "clear" : "glass"
              );
            }}
          >
            {themes[themeName].buttonLabel}
          </button>
          <button
            className="titlebar-button"
            type="button"
            onClick={() => {
              setIsPassthroughEnabled((current) => !current);
              window.terminalApi.setMousePassthrough(false);
            }}
          >
            {`穿透：${isPassthroughEnabled ? "开" : "关"}`}
          </button>
          <div className="status-pill">Shell attached</div>
          <button
            className="titlebar-button window-button"
            type="button"
            aria-label="最小化"
            onClick={() => window.terminalApi.minimizeWindow()}
          >
            _
          </button>
          <button
            className="titlebar-button window-button window-button-close"
            type="button"
            aria-label="关闭"
            onClick={() => window.terminalApi.closeWindow()}
          >
            ×
          </button>
        </div>
      </header>
      <main className="terminal-frame">
        <div ref={terminalElementRef} id="terminal">
          <div
            ref={terminalViewRef}
            className="terminal-view"
            aria-label="终端视图"
            onMouseDown={(event) => {
              event.preventDefault();
              focusTerminalView();
            }}
          >
            {lines.map((line) => (
              <div
                key={line.key}
                className={[
                  "terminal-view-line",
                  line.isCurrent ? "terminal-view-line-current" : "",
                  line.isFaint ? "terminal-view-line-faint" : ""
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {line.isCurrent ? (
                  <>
                    <span>{line.beforeCursor}</span>
                    <span className="terminal-view-cursor">{line.cursorCharacter}</span>
                    <span>{line.afterCursor}</span>
                  </>
                ) : (
                  line.text || " "
                )}
              </div>
            ))}
          </div>
          <div
            ref={terminalNativeRef}
            className="terminal-native-layer"
            aria-hidden="true"
          />
          <textarea
            ref={terminalInputProxyRef}
            className="terminal-input-proxy"
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            tabIndex={-1}
            aria-hidden="true"
            onKeyDown={handleKeyDown}
            onInput={() => {
              if (!isComposingRef.current) {
                flushProxyValue();
              }
            }}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={() => {
              isComposingRef.current = false;
              flushProxyValue();
            }}
            onPaste={handlePaste}
          />
        </div>
      </main>
    </div>
  );
}
