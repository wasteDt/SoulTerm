# SoulTerm

SoulTerm 是一个基于 Electron 的桌面终端应用。项目内置 `xterm.js` 作为终端渲染层，并通过 `node-pty` 连接本机 shell，让你在一个独立窗口中直接使用 PowerShell、cmd 或其他系统 shell。

## 功能

- 启动后自动打开独立终端窗口
- 终端直接连接本机 shell，可执行常规命令
- 默认记忆窗口位置和尺寸
- 支持无边框、透明背景、置顶窗口
- 支持玻璃模式和透明模式切换
- 支持鼠标穿透开关

## 运行环境

推荐环境：

- Node.js LTS
- pnpm 10+
- Windows 10 / 11

可先检查版本：

```bash
node -v
pnpm -v
```

## 安装依赖

在项目根目录执行：

```bash
pnpm install
```

如果你使用的是 `pnpm 10+`，首次安装前建议先执行：

```bash
pnpm approve-builds
```

然后允许 `electron` 和 `node-pty` 相关脚本运行，再重新执行：

```bash
pnpm install
```

如果 Electron 二进制或原生模块状态异常，可执行：

```bash
pnpm run fix:electron
```

## 本地运行

在项目根目录执行：

```bash
pnpm start
```

## 打包发布

这个项目现在已经接入 `electron-builder`，可直接生成 Windows 安装包。

### 1. 确认依赖已正确安装

打包前先确保以下依赖的安装脚本已经被允许执行：

- `electron`
- `node-pty`

如果你之前安装时被 `pnpm` 拦截过 build script，先执行：

```bash
pnpm approve-builds
pnpm install
```

必要时也可以手动重建：

```bash
pnpm rebuild node-pty
pnpm run fix:electron
```

### 2. 生成解包目录

这个命令会生成未封装安装器的应用目录，适合先验证打包结果：

```bash
pnpm build
```

输出目录：

```text
dist/win-unpacked
```

### 3. 生成 Windows 安装包

执行：

```bash
pnpm dist
```

默认会生成 `nsis` 安装包，产物位于：

```text
dist/
```

常见文件包括：

- `SoulTerm-1.0.0-x64.exe`
- `latest.yml`
- `win-unpacked/`

### 4. 对外发布

如果你只是手动分发给用户，通常只需要提供：

- `dist/SoulTerm-1.0.0-x64.exe`

如果后续你要做自动更新，再额外规划：

- 版本托管地址
- `latest.yml` 分发
- Electron 自动更新逻辑

当前仓库还没有接入自动更新，只完成了安装包构建链路。

## package.json 中的发布脚本

```json
{
  "scripts": {
    "start": "node ./bin/soulterm.js",
    "build": "electron-builder --dir",
    "dist": "electron-builder --win nsis"
  }
}
```

## 目录结构

```text
.
├─ bin/
│  └─ soulterm.js
├─ renderer/
│  ├─ index.html
│  ├─ renderer.js
│  └─ styles.css
├─ scripts/
│  └─ postinstall.js
├─ main.js
├─ preload.js
├─ package.json
└─ README.md
```

## 说明

- 当前默认打包目标为 Windows x64
- 当前未配置应用图标，安装包会使用默认图标
- 当前未接入代码签名；在部分系统上首次运行可能出现“未知发布者”提示
