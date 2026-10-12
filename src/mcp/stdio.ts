#!/usr/bin/env node
import { Command } from "commander";
import { VERSION } from "../sdk/version.js";
import { runStdio, type StdioOptions } from "./run-stdio.js";

const program = new Command().name("agentkit-mcp").version(VERSION)
  .description("Agentkit MCP over stdio. Read-only by default; supports MCP 2026-07-28 and legacy clients.")
  .option("--url <origin>", "Explicit API origin")
  .option("--allow-writes", "Expose agent creation, text knowledge and instruction updates")
  .option("--agent <uuid...>", "Restrict this connection to specified agent UUIDs");
program.parse();
const options = program.opts<StdioOptions>();
try {
  await runStdio(options);
} catch (error) {
  // Startup failures contain no API response bodies or credential values.
  console.error(JSON.stringify({ error: { code: "MCP_STARTUP_FAILED", message: error instanceof Error ? error.message : "Failed to start MCP." } }));
  process.exitCode = 1;
}
