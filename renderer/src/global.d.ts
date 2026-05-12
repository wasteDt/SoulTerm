export {};

declare global {
  interface Window {
    terminalApi: {
      sendInput: (data: string) => void;
      resize: (cols: number, rows: number) => void;
      onData: (listener: (data: string) => void) => () => void;
      onExit: (listener: (message: string) => void) => () => void;
      minimizeWindow: () => void;
      closeWindow: () => void;
      setMousePassthrough: (ignore: boolean) => void;
    };
  }
}
