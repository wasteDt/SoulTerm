# SoulTerm

SoulTerm 是一个从 Electron 启动后自动打开窗口的桌面终端项目。窗口内嵌了 `xterm.js`，并通过 `node-pty` 连接到本机 shell，因此可以直接执行和普通终端一致的命令。

## 功能

- 启动 `pnpm start` 后自动打开 Electron 窗口
- 窗口内直接连接本机 shell
- 支持终端输入、输出、窗口缩放同步
- Windows 默认优先连接 `powershell.exe`
- 终端默认目录跟随启动命令时所在的位置

## 安装

推荐使用 Node.js LTS 和 pnpm 10：

```bash
node -v
pnpm -v
```

在项目根目录执行：

```bash
pnpm install
```

这个项目现在会在 `postinstall` 阶段自动检查 Electron 二进制是否完整，如果缺失会自动补装。

如果你使用的是 pnpm 10+，并且本机开启了 build script 审批机制，第一次安装前先执行：

```bash
pnpm approve-builds
```

然后允许 `electron` 和 `node-pty` 的安装脚本继续运行，再执行 `pnpm install`。

如果是全新 Windows 环境，并且 `node-pty` 需要本地编译，还需要先准备：

```bash
winget install OpenJS.NodeJS.LTS
winget install Git.Git
winget install Microsoft.VisualStudio.2022.BuildTools
```

Visual Studio Build Tools 安装时至少勾选 “Desktop development with C++”。

## 运行

在项目根目录里启动：

```bash
pnpm start
```

此时 SoulTerm 的默认目录就是你执行 `pnpm start` 时所在的目录。

如果 Electron 二进制曾经下载失败，也可以单独修复：

```bash
pnpm run fix:electron
```

如果希望在任意 VS Code 终端目录里直接用命令启动，先在项目根目录注册全局命令：

```bash
pnpm link --global
```

注册完成后，可以在任意目录执行：

```bash
soulterm
```

例如你在 `D:\work\demo` 里执行 `soulterm`，打开后的 SoulTerm 默认目录就是 `D:\work\demo`。

## 项目结构

```text
.
├─ bin/
│  └─ soulterm.js
├─ main.js
├─ preload.js
├─ package.json
├─ renderer/
│  ├─ index.html
│  ├─ renderer.js
│  └─ styles.css
├─ scripts/
│  └─ postinstall.js
└─ README.md
```

## 说明

- `main.js` 负责创建 Electron 窗口并启动伪终端进程
- `bin/soulterm.js` 负责把启动命令所在目录传给 Electron 主进程
- `preload.js` 负责向渲染层暴露安全的终端 IPC 接口
- `renderer/renderer.js` 负责把 `xterm.js` 和 Electron IPC 桥接起来

## 数据流

1. 执行 `pnpm start` 或 `soulterm` 后，CLI 入口脚本启动 Electron。
2. 入口脚本把当前命令目录写入 `SOULTERM_CWD`，供主进程决定终端默认目录。
3. `main.js` 创建窗口，并在页面加载完成后用 `node-pty` 启动真实 shell。
4. `renderer/renderer.js` 把用户输入通过 `preload.js` 暴露的 API 发到主进程。
5. 主进程把输入写入 shell，再将 shell 输出回推给前端的 `xterm.js` 进行显示。
