#!/usr/bin/env node

const path = require("path");
const { spawn } = require("child_process");

const electronBinary = require("electron");
const appRoot = path.resolve(__dirname, "..");

const child = spawn(electronBinary, [appRoot], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: {
    ...process.env,
    SOULTERM_CWD: process.cwd()
  }
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
