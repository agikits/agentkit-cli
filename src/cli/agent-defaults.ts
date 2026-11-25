import type { Command } from "commander";

import { readConfig, writeConfig } from "../shared/config.js";
import { AGENT_ID, listProjects, loadProject } from "../shared/project.js";

function makeProjectOptional(command: Command): void {
  for (const child of command.commands) makeProjectOptional(child);
  const [project, ...tail] = command.registeredArguments;
  if (project?.name() !== "project") return;

  const requiredTail = tail.filter(arg => arg.required);
  const usage = tail.map(arg => arg.required ? `<${arg.name()}>` : `[${arg.name()}]`);
  command.usage(["[options]", "[project]", ...usage, ...(command.commands.length ? ["[command]"] : [])].join(" "));
  // Assign positionals after Commander parses the options. The leading project
  // can be omitted even when later arguments are required.
  for (const arg of command.registeredArguments) arg.required = false;
  command.hook("preAction", async (owner, action) => {
    if (owner !== action) return;
    const args = action.args;
    if (args.length > tail.length) return;

    const fallback = process.env.AGENTKIT_AGENT_ID || (await readConfig()).agent;
    if (args.length < requiredTail.length) throw new Error(`Missing required argument: ${requiredTail[args.length]!.name()}.`);
    if (!fallback) {
      if (!args.length) throw new Error("Provide a project, set AGENTKIT_AGENT_ID, or run agentkit config set agent <id|alias>.");
      if (args.length === requiredTail.length) throw new Error(`Missing required argument: ${requiredTail[args.length - 1]!.name()}.`);
      return;
    }
    // Both layouts can fit when a trailing argument is optional. A known UUID
    // or alias in the first position keeps its meaning as an explicit project.
    const first = args[0];
    if (args.length > requiredTail.length && first && (AGENT_ID.test(first) || (await listProjects()).includes(first))) return;
    action.processedArgs = [fallback, ...args];
  });
}

export function registerAgentDefaults(program: Command, print: (value: unknown) => void): void {
  program.command("config").description("Manage local CLI defaults")
    .command("set <setting> <value>").description("Save a default agent UUID or alias with config set agent")
    .action(async (setting: string, value: string) => {
      if (setting !== "agent") throw new Error("Only the agent setting is supported.");
      await loadProject(value);
      await writeConfig({ ...await readConfig(), agent: value });
      print({ agent: value });
    });
  makeProjectOptional(program);
}
