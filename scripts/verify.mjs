import { spawnSync } from "node:child_process";
import process from "node:process";

const buildOnly = process.argv.includes("--build-only");
const testOnly = process.argv.includes("--test-only");

const commands = [
  ...(testOnly ? [] : [{ label: "sanitize", command: "node", args: ["scripts/sanitize-check.mjs"] }]),
  {
    label: "build provider layer",
    command: "npm",
    args: ["run", "build", "-w", "@onedirect/data-fetcher-provider-layer"],
  },
  {
    label: "build bus ETA",
    command: "npm",
    args: ["run", "build", "-w", "@onedirect/bus-eta-engine"],
  },
  {
    label: "build smart search",
    command: "npm",
    args: ["run", "build", "-w", "@onedirect/smart-transit-search-keyboard"],
  },
  {
    label: "build navigation",
    command: "npm",
    args: ["run", "build", "-w", "@onedirect/transit-navigation"],
  },
  {
    label: "build geofencing",
    command: "npm",
    args: ["run", "build", "-w", "@onedirect/geofencing-engine"],
  },
  {
    label: "build map viewport",
    command: "npm",
    args: ["run", "build", "-w", "@onedirect/map-viewport-ui"],
  },
  {
    label: "build demo hub",
    command: "npm",
    args: ["run", "build", "-w", "@onedirect/demo-hub"],
  },
  ...(buildOnly
    ? []
    : [
        {
          label: "tests provider layer",
          command: "npm",
          args: ["run", "test", "-w", "@onedirect/data-fetcher-provider-layer"],
        },
        {
          label: "tests bus ETA",
          command: "npm",
          args: ["run", "test", "-w", "@onedirect/bus-eta-engine"],
        },
        {
          label: "tests smart search",
          command: "npm",
          args: ["run", "test", "-w", "@onedirect/smart-transit-search-keyboard"],
        },
        {
          label: "tests navigation",
          command: "npm",
          args: ["run", "test", "-w", "@onedirect/transit-navigation"],
        },
        {
          label: "tests geofencing",
          command: "npm",
          args: ["run", "test", "-w", "@onedirect/geofencing-engine"],
        },
        {
          label: "tests map viewport",
          command: "npm",
          args: ["run", "test", "-w", "@onedirect/map-viewport-ui"],
        },
      ]),
];

for (const task of commands) {
  console.log(`\n[verify] ${task.label}`);
  const npmCli = process.env.npm_execpath;
  const executable =
    task.command === "node" || (task.command === "npm" && npmCli)
      ? process.execPath
      : task.command;
  const args =
    task.command === "npm" && npmCli
      ? [npmCli, ...task.args]
      : task.args;
  const result = spawnSync(executable, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    console.error(`[verify] could not start ${task.label}:`, result.error.message);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!buildOnly) {
  console.log("\n[verify] all checks passed");
}
