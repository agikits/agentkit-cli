import { spawn } from "node:child_process";
import { hostname } from "node:os";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { setTimeout as wait } from "node:timers/promises";
import { Command, Option } from "commander";

import { AgentkitClient } from "../sdk/client.js";
import { AgentkitError } from "../sdk/errors.js";
import type { components } from "../sdk/generated.js";
import { configPath, readConfig, rememberKey, resolveConfig, writeConfig } from "../shared/config.js";
import { readStdin } from "./input.js";

type AuthOptions = { browser?: boolean; withToken?: boolean; withSessionToken?: boolean };
type GlobalOptions = { key?: string; url?: string; json?: boolean; quiet?: boolean; input?: boolean; timeout?: number };
type Schemas = components["schemas"];
type DeviceCode = Schemas["DeviceCode"];
type DeviceToken = Schemas["DeviceToken"];

const flowErrors = new Map([
  ["expired_token", "The sign-in code expired. Run agentkit auth login --browser for a new code."],
  ["access_denied", "Browser sign-in was denied. Check your workspace access and try again."],
  ["invalid_grant", "The sign-in code is invalid or was already used. Run agentkit auth login --browser for a new code."],
  ["key_limit_reached", "The workspace has reached its API key limit. Revoke an existing key before signing in."],
]);

function hiddenKey(signal: AbortSignal): Promise<string> {
  signal.throwIfAborted();
  const silent = new Writable({ write(_chunk, _encoding, done) { done(); } });
  const terminal = createInterface({ input: process.stdin, output: silent, terminal: true, historySize: 0 });
  process.stderr.write("Agentkit API key: ");
  const close = () => terminal.close();
  return new Promise<string>((resolve, reject) => {
    terminal.once("close", () => reject(signal.reason ?? new Error("API key input cancelled.")));
    terminal.question("", resolve);
    signal.addEventListener("abort", close, { once: true });
  }).finally(() => {
    signal.removeEventListener("abort", close);
    terminal.close();
    process.stderr.write("\n");
  });
}

function verificationUrl(value: string, origin: string): string {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin || url.username || url.password) {
    throw new Error("Browser sign-in returned a verification URL outside the API origin.");
  }
  return url.href;
}

async function openBrowser(url: string): Promise<void> {
  const [command, ...args] = process.platform === "darwin" ? ["open"]
    : process.platform === "win32" ? ["rundll32.exe", "url.dll,FileProtocolHandler"] : ["xdg-open"];
  const child = spawn(command!, [...args, url], { detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
  await new Promise<void>((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });
}

function positiveSeconds(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

async function browserLogin(client: AgentkitClient, url: string, open: boolean, signal: AbortSignal): Promise<DeviceToken> {
  const code = await client.requestJson<DeviceCode>("POST", "/api/v2/auth/device/code", { client_name: hostname().trim().slice(0, 64) || "Agentkit CLI" });
  const verification = verificationUrl(code.verification_uri, url);
  const complete = verificationUrl(code.verification_uri_complete, url);
  if (!positiveSeconds(code.expires_in) || !positiveSeconds(code.interval) || !/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code.user_code) ||
      typeof code.device_code !== "string" || !code.device_code) {
    throw new Error("The API returned an invalid browser sign-in code.");
  }
  rememberKey(code.device_code);
  const deadline = performance.now() + code.expires_in * 1000;
  let interval = code.interval;
  console.error(`Enter code ${code.user_code} at ${verification}`);
  if (open) {
    try { await openBrowser(complete); }
    catch { console.error("Could not open a browser. Open the verification URL manually."); }
  }

  for (;;) {
    const remaining = deadline - performance.now();
    if (remaining <= 0) break;
    const delay = interval * 1000;
    await wait(Math.ceil(Math.min(delay, remaining)), undefined, { signal });
    if (delay >= remaining || performance.now() >= deadline) break;
    try {
      return await client.requestJson<DeviceToken>("POST", "/api/v2/auth/device/token", { device_code: code.device_code });
    } catch (error) {
      if (!(error instanceof AgentkitError)) throw error;
      if (error.code === "authorization_pending") continue;
      if (error.code === "slow_down") {
        const { interval: next } = (error.details ?? {}) as { interval?: unknown };
        interval = positiveSeconds(next) ? next : interval + 5;
        continue;
      }
      const message = flowErrors.get(error.code);
      if (message) throw new AgentkitError({ code: error.code, status: error.status, message });
      throw error;
    }
  }
  throw new AgentkitError({ code: "expired_token", status: 0, message: flowErrors.get("expired_token")! });
}

export function registerAuthCommands(
  program: Command,
  globals: () => GlobalOptions,
  signal: AbortSignal,
  print: (value: unknown) => void,
  cell: (value: unknown) => string,
): void {
  const auth = program.command("auth").description("Sign in, inspect credentials and sign out");
  const makeClient = (url: string, key?: string, sessionToken?: string) =>
    new AgentkitClient({ baseUrl: url, key, sessionToken, signal, timeoutMs: globals().timeout });

  function login(command: Command, legacy = false): void {
    command.description("Save credentials to the local config")
      .option("--browser", "Sign in and approve access in a browser")
      .option("--with-token", "Read an API key from stdin")
      .addOption(new Option("--with-session-token", "Read a user access token from stdin").hideHelp())
      .action(async (opts: AuthOptions) => {
        const options = globals();
        if ([opts.browser, opts.withToken, opts.withSessionToken, options.key].filter(Boolean).length > 1) {
          throw new Error("Choose one credential input.");
        }
        const { url } = await resolveConfig(options, { ignoreCredentials: true });
        if (opts.withSessionToken) {
          const sessionToken = rememberKey((await readStdin()).trim());
          if (!sessionToken) throw new Error("No session token received on stdin.");
          await writeConfig({ ...await readConfig(), url, sessionToken, sessionUrl: url });
          print({ saved: true, auth: "session" });
          return;
        }
        if (legacy && options.url && !options.key && !opts.withToken && !opts.browser) {
          await writeConfig({ ...await readConfig(), url });
          if (options.json) print({ saved: true });
          else if (!options.quiet) console.log(`Saved config to ${configPath()}`);
          return;
        }
        let account: DeviceToken["account"] | undefined;
        let key = options.key;
        if (opts.browser) {
          const result = await browserLogin(makeClient(url), url, options.input !== false && process.stdin.isTTY === true, signal);
          key = result.api_key;
          account = result.account;
        } else if (opts.withToken) {
          key = (await readStdin()).trim();
        } else if (!key) {
          if (options.input === false || !process.stdin.isTTY) {
            throw new Error("API key input requires a terminal. Pipe a key to agentkit auth login --with-token, or use --browser.");
          }
          key = (await hiddenKey(signal)).trim();
        }
        if (!key) throw new Error(opts.withToken ? "No token received on stdin." : "No API key received.");
        rememberKey(key);
        await writeConfig({ ...await readConfig(), url, key, keyUrl: url });
        if (options.json) print({ saved: true, ...(account && { account }) });
        else if (account) console.log(`Signed in to ${cell(account.name)}.`);
        else if (!options.quiet) console.log(`Saved API key to ${configPath()}`);
      });
  }

  function logout(command: Command): void {
    command.description("Revoke the saved API key and remove saved credentials")
      .option("--session", "Remove only the saved user session token")
      .action(async (opts: { session?: boolean }) => {
        const config = await readConfig();
        const { key, keyUrl, sessionToken, sessionUrl, ...other } = config;
        if (opts.session) {
          await writeConfig({ ...other, key, keyUrl });
          print({ loggedOut: true, scope: "session" });
          return;
        }
        let serverKeyRevoked = false;
        if (key && keyUrl) {
          try {
            const { url } = await resolveConfig(globals(), { ignoreCredentials: true });
            if (url !== keyUrl) throw new Error("Saved API key belongs to a different origin.");
            await makeClient(url, key).requestJson("DELETE", "/api/v2/auth/key");
            serverKeyRevoked = true;
          } catch {
            // A failed revoke must still clear the saved credentials.
          }
        }
        // Login may have replaced the credentials while the revoke request was in flight.
        const current = await readConfig();
        if (current.key === key && current.keyUrl === keyUrl) {
          delete current.key;
          delete current.keyUrl;
        }
        if (current.sessionToken === sessionToken && current.sessionUrl === sessionUrl) {
          delete current.sessionToken;
          delete current.sessionUrl;
        }
        await writeConfig(current);
        if (key && !serverKeyRevoked) console.error("Could not revoke the API key on the server. The saved key was removed locally.");
        print({ loggedOut: true, serverKeyRevoked });
      });
  }

  login(auth.command("login"));
  logout(auth.command("logout"));
  login(program.command("init", { hidden: true }), true);
  logout(program.command("logout", { hidden: true }));
  auth.command("status").description("Show the active credential, workspace and scopes")
    .action(async () => {
      const config = await resolveConfig(globals(), { requireKey: false, allowSession: "fallback" });
      const credentialLocation = config.keyLocation ?? config.sessionLocation;
      if (!credentialLocation) throw new Error("No Agentkit credentials configured. Run agentkit auth login.");
      const { account, credential } = await makeClient(config.url, config.key, config.sessionToken)
        .whoami();
      if (globals().json) print({ account, credential, credentialLocation });
      else {
        const locations = { flag: "--key flag", env: "environment variable", config: "config file" };
        console.log(account ? `Workspace: ${cell(account.name)} (${cell(account.slug)})` : "Workspace: (none selected; the session belongs to several workspaces)");
        console.log(`Credential: ${cell(credential.source)} (${locations[credentialLocation]})`);
        console.log(`Scopes: ${credential.scopes.map(cell).join(", ") || "(none)"}`);
      }
    });
}
