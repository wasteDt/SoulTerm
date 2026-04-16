#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const electronDir = path.join(rootDir, "node_modules", "electron");
const electronInstallScript = path.join(electronDir, "install.js");
const electronPathFile = path.join(electronDir, "path.txt");
const electronDistDir = path.join(electronDir, "dist");
const forceInstall = process.argv.includes("--force");

function hasElectronBinary() {
  return (
    fs.existsSync(electronInstallScript) &&
    fs.existsSync(electronPathFile) &&
    fs.existsSync(electronDistDir)
  );
}

function runElectronInstall() {
  const result = spawnSync(process.execPath, [electronInstallScript], {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!fs.existsSync(electronInstallScript)) {
  console.warn("[postinstall] electron/install.js not found, skipping Electron repair.");
  process.exit(0);
}

if (forceInstall || !hasElectronBinary()) {
  console.log("[postinstall] Installing Electron binary...");
  runElectronInstall();
}

if (!hasElectronBinary()) {
  console.error("[postinstall] Electron binary is still missing after repair.");
  process.exit(1);
}

console.log("[postinstall] Electron binary is ready.");
