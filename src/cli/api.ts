import { readFile } from "node:fs/promises";
import { Command, InvalidArgumentError } from "commander";

import { AgentkitClient } from "../sdk/client.js";
import { resolveConfig } from "../shared/config.js";
import { readStdin } from "./input.js";

type Pair = [string, string];

function collectPair(value: string, previous: Pair[]): Pair[] {
  const separator = value.indexOf("=");
  if (separator < 1) throw new InvalidArgumentError("expected key=value");
  return [...previous, [value.slice(0, separator), value.slice(separator + 1)]];
}

async function jsonBody(value: string): Promise<unknown> {
  const text = value === "@-" ? await readStdin() : value.startsWith("@") ? await readFile(value.slice(1), "utf8") : value;
  try { return JSON.parse(text); }
  catch { throw new Error("--body must contain valid JSON."); }
}

export function registerApiCommand(
  program: Command,
  globals: () => { url?: string; key?: string; timeout?: number },
  signal: AbortSignal,
  print: (value: unknown) => void,
): void {
  program.command("api <method> <path>")
    .description("Send an API v2 request and print JSON")
    .option("--body <json|@file|@->", "JSON body, a file prefixed with @, or @- for stdin")
    .option("-f, --field <key=value>", "Add a string field to the JSON body (repeatable)", collectPair, [])
    .option("--query <key=value>", "Append a query parameter (repeatable)", collectPair, [])
    .action(async (method: string, path: string, opts: { body?: string; field: Pair[]; query: Pair[] }) => {
      method = method.toUpperCase();
      if (!/^(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)$/.test(method)) throw new Error("Unsupported API method.");
      if (opts.body !== undefined && opts.field.length) throw new Error("Choose either --body or -f.");
      if ((method === "GET" || method === "HEAD") && (opts.body !== undefined || opts.field.length)) {
        throw new Error(`${method} requests cannot have a body. Use --query for URL parameters.`);
      }
      const body = opts.body !== undefined ? await jsonBody(opts.body) : opts.field.length ? Object.fromEntries(opts.field) : undefined;
      const options = globals();
      const { url, key, sessionToken } = await resolveConfig(options, { requireKey: false, allowSession: "fallback" });
      const client = new AgentkitClient({ baseUrl: url, key, sessionToken, signal, timeoutMs: options.timeout });
      print(await client.requestJson(method, path, body, opts.query));
    });
}
