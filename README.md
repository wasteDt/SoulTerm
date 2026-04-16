# SoulTerm

SoulTerm 是一个基于 Electron 的桌面终端应用。项目内置 `xterm.js` 作为终端渲染层，并通过 `node-pty` 连接本机 shell，让你在一个独立桌面窗口里直接使用 PowerShell、cmd 或其他系统 shell。

## 项目功能

- 启动后自动打开独立终端窗口
- 终端直接连接本机 shell，可执行常规命令
- Windows 下默认优先连接 `powershell.exe`，如果环境中指定了其他 shell 也会自动复用
- 默认工作目录跟随启动命令时所在目录
- 支持窗口缩放后自动同步终端行列数
- 支持窗口位置和尺寸记忆，重新启动后恢复上次状态
- 提供无边框、透明背景、置顶显示的终端窗口
- 支持两种界面风格切换：玻璃模式 / 透明模式
- 支持鼠标穿透开关，适合透明悬浮终端场景
- 提供最小化、关闭、拖动窗口等基础窗口控制
- 支持键盘输入、方向键、常见控制键、粘贴和输入法输入

## 运行环境

推荐使用：

- Node.js LTS
- pnpm 10+
- Windows 10 / 11

可先检查版本：

```bash
node -v
pnpm -v
```

## 安装

在项目根目录执行：

```bash
pnpm install
```

项目会在 `postinstall` 阶段自动检查 Electron 二进制是否完整，缺失时会自动尝试修复。

如果你使用的是 `pnpm 10+`，且本机开启了 build script 审批机制，首次安装前先执行：

```bash
pnpm approve-builds
```

然后允许 `electron` 和 `node-pty` 相关脚本运行，再重新执行：

```bash
pnpm install
```

如果是全新的 Windows 环境，并且 `node-pty` 需要本地编译，通常还需要准备：

```bash
winget install OpenJS.NodeJS.LTS
winget install Git.Git
winget install Microsoft.VisualStudio.2022.BuildTools
```

安装 Visual Studio Build Tools 时，至少勾选 `Desktop development with C++`。

## 使用方法

### 方式一：在项目目录直接启动

在项目根目录执行：

```bash
pnpm start
```

执行后会自动打开 SoulTerm 窗口，此时终端的默认工作目录就是你执行 `pnpm start` 时所在的目录。

### 方式二：注册为全局命令后启动(有问题暂未实现)

如果希望在任意目录下直接打开 SoulTerm，可以先在项目根目录执行：

```bash
pnpm link --global
```

注册完成后，在任意目录中运行：

```bash
soulterm
```

例如你在 `D:\work\demo` 目录执行 `soulterm`，那么打开后的终端默认目录就是 `D:\work\demo`。

### 常用操作

- 点击标题栏中的“玻璃模式 / 透明模式”可切换界面风格
- 点击“穿透：开/关”可控制鼠标是否穿透窗口
- 点击“拖动”区域可移动窗口
- 点击 `_` 可最小化窗口
- 点击 `×` 可关闭窗口

### 修复 Electron 依赖

如果 Electron 二进制下载不完整或安装异常，可以单独执行修复命令：

```bash
pnpm run fix:electron
```

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

## 主要文件说明

- `main.js`：创建 Electron 窗口、启动 PTY、处理窗口控制和 IPC
- `bin/soulterm.js`：CLI 启动入口，负责从命令行启动 Electron，并传递当前工作目录
- `preload.js`：向渲染层暴露安全的终端与窗口控制 API
- `renderer/renderer.js`：负责终端输入输出、主题切换、鼠标穿透和界面交互
- `renderer/styles.css`：负责终端窗口的视觉样式

## 工作流程

1. 执行 `pnpm start` 或 `soulterm`
2. CLI 入口脚本启动 Electron，并记录当前工作目录
3. `main.js` 创建窗口，并通过 `node-pty` 启动本机 shell
4. 渲染层通过 `xterm.js` 展示终端内容
5. 用户输入通过 `preload.js` 和 IPC 发送到主进程，再写入真实 shell
6. shell 输出再回传到前端界面显示
