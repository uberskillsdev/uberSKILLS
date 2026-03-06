#!/usr/bin/env node

import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const VERSION = "0.9.0";
const REPO_URL = "https://github.com/hvasconcelos/uberskills.git";
const UBERSKILLS_HOME = join(homedir(), ".uberskills");
const APP_DIR = join(UBERSKILLS_HOME, "app");
const VERSION_FILE = join(UBERSKILLS_HOME, ".version");
const PNPM_VERSION = "9.15.4";

function parseArgs(argv) {
  const args = {
    port: 3000,
    host: "localhost",
    dataDir: null,
    help: false,
    version: false,
    reset: false,
  };

  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case "--port":
        args.port = parseInt(argv[++i], 10);
        if (isNaN(args.port)) {
          console.error("Error: --port requires a valid number");
          process.exit(1);
        }
        break;
      case "--host":
        args.host = argv[++i];
        if (!args.host) {
          console.error("Error: --host requires a value");
          process.exit(1);
        }
        break;
      case "--data-dir":
        args.dataDir = argv[++i];
        if (!args.dataDir) {
          console.error("Error: --data-dir requires a path");
          process.exit(1);
        }
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
      case "--version":
      case "-v":
        args.version = true;
        break;
      case "--reset":
        args.reset = true;
        break;
      default:
        console.error(`Unknown option: ${argv[i]}`);
        printUsage();
        process.exit(1);
    }
  }

  return args;
}

function printUsage() {
  console.log(`
uberSKILLS v${VERSION}

Usage: uberskills [options]

Options:
  --port <number>    Port to run on (default: 3000)
  --host <string>    Host to bind to (default: localhost)
  --data-dir <path>  Custom data directory (default: ~/.uberskills/data/)
  --reset            Delete cached install and re-setup
  --version, -v      Show version
  --help, -h         Show this help message
`);
}

function checkPrerequisites() {
  const nodeVersion = process.versions.node;
  const major = parseInt(nodeVersion.split(".")[0], 10);
  if (major < 20) {
    console.error(`Error: Node.js >= 20 required (found v${nodeVersion})`);
    process.exit(1);
  }

  try {
    execSync("git --version", { stdio: "ignore" });
  } catch {
    console.error("Error: git is required but not found in PATH");
    console.error("Install git: https://git-scm.com/downloads");
    process.exit(1);
  }
}

function run(cmd, opts = {}) {
  console.log(`  $ ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...opts });
}

function ensureInstalled(reset) {
  mkdirSync(UBERSKILLS_HOME, { recursive: true });

  if (reset && existsSync(UBERSKILLS_HOME)) {
    console.log("Resetting uberSKILLS installation...");
    rmSync(APP_DIR, { recursive: true, force: true });
    rmSync(VERSION_FILE, { force: true });
  }

  if (existsSync(VERSION_FILE)) {
    const cachedVersion = readFileSync(VERSION_FILE, "utf-8").trim();
    if (cachedVersion === VERSION) {
      return;
    }
    console.log(`Upgrading uberSKILLS from v${cachedVersion} to v${VERSION}...`);
    rmSync(APP_DIR, { recursive: true, force: true });
  }

  console.log(`\nSetting up uberSKILLS v${VERSION} (first run, this may take a few minutes)...\n`);

  run(`git clone --depth 1 --branch v${VERSION} ${REPO_URL} ${APP_DIR}`);

  console.log("\nEnabling pnpm via corepack...");
  run("corepack enable", { cwd: APP_DIR });
  run(`corepack prepare pnpm@${PNPM_VERSION} --activate`, { cwd: APP_DIR });

  console.log("\nInstalling dependencies...");
  run("pnpm install --frozen-lockfile", { cwd: APP_DIR });

  console.log("\nBuilding application...");
  run("pnpm build", { cwd: APP_DIR });

  writeFileSync(VERSION_FILE, VERSION, "utf-8");
  console.log("\nSetup complete!\n");
}

function resolveDataDir(customPath) {
  const dataDir = customPath || join(UBERSKILLS_HOME, "data");
  mkdirSync(dataDir, { recursive: true });
  return dataDir;
}

function resolveEncryptionSecret(dataDir) {
  const secretPath = join(dataDir, ".secret");
  if (existsSync(secretPath)) {
    return readFileSync(secretPath, "utf-8").trim();
  }
  const secret = randomBytes(32).toString("hex");
  writeFileSync(secretPath, secret, { mode: 0o600 });
  return secret;
}

function printBanner(port, host, dataDir) {
  const url = `http://${host}:${port}`;
  const dbPath = join(dataDir, "uberskills.db");

  console.log(`
┌─────────────────────────────────────────────────┐
│                                                 │
│   uberSKILLS is running!                        │
│                                                 │
│   Local:  ${url.padEnd(38)}│
│   Data:   ${dbPath.length > 38 ? "..." + dbPath.slice(-35) : dbPath.padEnd(38)}│
│                                                 │
│   Press Ctrl+C to stop                          │
│                                                 │
└─────────────────────────────────────────────────┘
`);
}

function startServer(port, host, dataDir, encryptionSecret) {
  const standaloneDir = join(APP_DIR, "apps", "web", ".next", "standalone");
  const serverScript = join("apps", "web", "server.js");

  const child = spawn("node", [serverScript], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      NODE_ENV: "production",
      DATABASE_URL: `file:${join(dataDir, "uberskills.db")}`,
      ENCRYPTION_SECRET: encryptionSecret,
      PORT: String(port),
      HOSTNAME: host,
    },
    stdio: "inherit",
  });

  child.on("error", (err) => {
    console.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });

  const shutdown = () => {
    child.kill("SIGTERM");
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// Main
const args = parseArgs(process.argv);

if (args.help) {
  printUsage();
  process.exit(0);
}

if (args.version) {
  console.log(`uberskills v${VERSION}`);
  process.exit(0);
}

checkPrerequisites();
ensureInstalled(args.reset);

const dataDir = resolveDataDir(args.dataDir);
const encryptionSecret = resolveEncryptionSecret(dataDir);

printBanner(args.port, args.host, dataDir);
startServer(args.port, args.host, dataDir, encryptionSecret);
