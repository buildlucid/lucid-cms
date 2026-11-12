import { randomUUID } from "node:crypto";

/**
 * Scripts tell the harness's fake Lucid API how its model answers. A test puts one in the message
 * it sends, or anywhere else a model request carries text, such as a routine's instructions or a
 * sub-agent's task. The fake plays the newest script's turns in order, one per model request, so
 * it needs no state of its own and works the same however many CMSs share it. A message without
 * a script is answered `You said: …`.
 *
 * `failTurn()` fails a turn, `times` only that many attempts. A turn's `gate` holds its stream open
 * until `openGate()`, and `waitAtGate()` waits until it is held, so a test can steer, queue or stop
 * a run mid-turn. `failGenerate()` and `gateGenerate()` do the same for other AI requests, such as
 * alt text or a translation.
 *
 * @example
 * ```ts
 * await chat.send(script(callTool("documents_find", { collection: "story" }), reply("Found them.")));
 * ```
 */

/** A tool the model calls, with the input it calls it with. */
export type ScriptCall = { name: string; input: Record<string, unknown> };

/** How a model turn fails instead of answering. */
export type ScriptFailure =
	/** Lucid's API refuses the request before streaming, such as for credits or access. */
	| { kind: "http"; status: number; key?: string }
	/** The stream sends an error event, such as `ai_content_blocked` or `cms_ai_context_exceeded`. */
	| { kind: "event"; message: string }
	/** The stream ends before its finish event. Lucid still charges for it. */
	| { kind: "cut" }
	/** The stream sends an event the CMS cannot read. */
	| { kind: "invalid" }
	/** The finish event names another request. */
	| { kind: "mismatch" }
	/** The answer is JSON rather than an event stream. */
	| { kind: "not-stream" };

/** One model request's answer. */
export type ScriptTurn = {
	text?: string;
	calls?: ScriptCall[];
	/**
	 * Holds the turn's stream open after it starts until a test opens the gate, so a test can act
	 * while a model request is in flight. See `openGate` in `shared/helpers/ai.ts`.
	 */
	gate?: string;
	/** Fails instead of answering. `times` fails that many attempts, then answers; leave it out to always fail. */
	fail?: ScriptFailure & { times?: number };
	/** What the turn costs. Defaults to one credit. */
	credits?: number;
	/** The input tokens the turn reports, such as to push a chat near its context limit. */
	inputTokens?: number;
};

export type Script = {
	/** Names the script's attempts in the fake, so a turn's failures count once across retries. */
	id: string;
	/** Turns already played before this copy of the script, as a compaction summary carries it. */
	offset: number;
	turns: ScriptTurn[];
};

/** What the fake answers once a script runs out of turns, which ends the run. */
export const SCRIPT_END_REPLY = "Done.";

const MARKER = /\[harness-script:([A-Za-z0-9_-]+)\]/g;

/** Writes a script as text a message can carry. */
export const encodeScript = (value: Script): string =>
	`[harness-script:${Buffer.from(JSON.stringify(value)).toString("base64url")}]`;

/**
 * Drops the backslashes Markdown adds before punctuation. The admin's chat box sends Markdown, so
 * a script typed into it arrives as `\[harness-script:...\]`, with `\_` inside.
 */
export const unescapeMarkdown = (text: string): string =>
	text.replaceAll(/\\([[\]_*-])/g, "$1");

/** Reads the last script in some text, or null when it has none. */
export const decodeScript = (text: string): Script | null => {
	const matches = [...unescapeMarkdown(text).matchAll(MARKER)];
	const last = matches.at(-1)?.[1];
	if (!last) {
		return null;
	}
	try {
		return JSON.parse(Buffer.from(last, "base64url").toString()) as Script;
	} catch {
		return null;
	}
};

/** A script of these turns, as text to send. */
export const script = (...turns: ScriptTurn[]): string =>
	encodeScript({ id: randomUUID(), offset: 0, turns });

/** A turn that replies with text and calls nothing, which ends a chat's run. */
export const reply = (
	text: string,
	options?: Omit<ScriptTurn, "text" | "calls">,
): ScriptTurn => ({
	...options,
	text,
});

/** A turn that calls one tool. */
export const callTool = (
	name: string,
	input: Record<string, unknown> = {},
	options?: Omit<ScriptTurn, "calls">,
): ScriptTurn => ({ ...options, calls: [{ name, input }] });

/** A routine's last turn: it says the result, then ends the run with it, as routines must. */
export const finishRoutine = (
	summary: string,
	outcome: "done" | "nothing_to_report" | "needs_review" = "done",
): ScriptTurn => ({
	text: summary,
	calls: [{ name: "lucid_finish_run", input: { outcome, summary } }],
});

/** A turn that calls several tools at once. */
export const callTools = (
	calls: ScriptCall[],
	options?: Omit<ScriptTurn, "calls">,
): ScriptTurn => ({ ...options, calls });

/** A turn that fails. */
export const failTurn = (
	failure: ScriptFailure,
	options?: { times?: number } & Omit<ScriptTurn, "fail">,
): ScriptTurn => {
	const { times, ...turn } = options ?? {};
	return { ...turn, fail: { ...failure, times } };
};

/**
 * Text that makes a non-agent AI request fail, such as alt text or a translation. Put it in the
 * request's instruction or any text it sends.
 */
export const failGenerate = (status: number, key: string): string =>
	`[harness-fail:${status}:${key}]`;

/** Text that holds a non-agent AI request until a test opens the gate. */
export const gateGenerate = (gate: string): string => `[harness-gate:${gate}]`;

/** Reads a non-agent request's failure from its text. */
export const findGenerateFailure = (
	text: string,
): { status: number; key: string } | null => {
	const match = /\[harness-fail:(\d{3}):([a-z0-9_]+)\]/.exec(text);
	return match ? { status: Number(match[1]), key: match[2] ?? "" } : null;
};

/** Reads a non-agent request's gate from its text. */
export const findGenerateGate = (text: string): string | null =>
	/\[harness-gate:([A-Za-z0-9_-]+)\]/.exec(text)?.[1] ?? null;
