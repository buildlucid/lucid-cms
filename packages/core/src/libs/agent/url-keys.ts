import { createHash } from "node:crypto";
import type { StoredAgentMessagePart } from "../../schemas/agent.js";
import { analyzeMediaToolName } from "../../services/agent/tools/analyze-media/constants.js";
import runnerTools from "./runner-tools.js";

//* Start at a hostname boundary so long words are scanned once rather than retried at every character.
//* Scheme optional, so bare mentions such as "example.com/pricing" count too.
const urlPattern =
	/(?<![a-z0-9.-])(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z][a-z0-9-]{1,62}(?:[/?#][^\s"'<>`)\]}\\]*)?/gi;

/**
 * Tools whose results can repeat the agent's own words, so they cannot vouch
 * for a URL. File analysis is written by a model that sees the agent's
 * question, so a file could make it echo that question back inside a URL.
 */
const echoingTools: ReadonlySet<string> = new Set([
	runnerTools.history.name,
	runnerTools.progress.name,
	runnerTools.skill.name,
	runnerTools.finish.name,
	analyzeMediaToolName,
]);

/** Identifies a page, ignoring scheme, www., trailing slashes and fragments. Query strings must match exactly. */
export const webUrlKey = (value: string) => {
	try {
		const url = new URL(
			/^https?:\/\//i.test(value) ? value : `https://${value}`,
		);
		const host = url.hostname.replace(/^www\./, "");
		return `${host}${url.pathname.replace(/\/+$/, "")}${url.search}`;
	} catch {
		return undefined;
	}
};

export const addWebUrlKeys = (keys: Set<string>, text: string) => {
	for (const [match] of text.matchAll(urlPattern)) {
		const key = webUrlKey(match.replace(/[.,;:!?]+$/, ""));
		if (key) keys.add(key);
	}
	return keys;
};

/** Identifies a source for de-duplication, also ignoring tracking parameters. */
export const webSourceKey = (value: string) => {
	try {
		const url = new URL(value);
		for (const name of [...url.searchParams.keys()]) {
			if (/^(?:utm_|fbclid$|gclid$|mc_[ce]id$)/i.test(name)) {
				url.searchParams.delete(name);
			}
		}
		return webUrlKey(url.toString());
	} catch {
		return undefined;
	}
};

/** Fixed-size digests keep long URLs within database index limits without discarding query strings. */
export const urlKeyDigest = (key: string) =>
	createHash("sha256").update(key).digest("hex");

/** Extracts URLs supplied by a person or a tool, keeping assistant text and echoed inputs untrusted. */
export const messageUrlKeys = (message: {
	role: "user" | "assistant";
	parts: readonly StoredAgentMessagePart[];
}) => {
	const keys = new Set<string>();

	for (const part of message.parts) {
		if (message.role === "user" && part.type === "text") {
			addWebUrlKeys(keys, part.text);
		} else if (part.type === "tool" && !echoingTools.has(part.name)) {
			addWebUrlKeys(keys, JSON.stringify(part.output ?? null));
		}
	}

	return keys;
};
