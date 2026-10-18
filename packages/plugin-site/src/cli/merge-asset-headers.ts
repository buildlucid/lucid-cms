import { ASSETS_BASE, IMMUTABLE_CACHE_CONTROL } from "../constants.js";

// Built files sit directly in `/_assets/`, so a placeholder matches them all. Unlike `/_assets/*`, it doesn't replace a
// project's own `/_assets/*` rule, which Cloudflare does for rules with the same path.
const RULE = `${ASSETS_BASE}:asset`;
// `!` drops Cache-Control from earlier rules, such as `/*`, which Cloudflare would otherwise combine with ours.
const HEADERS = [
	"  ! Cache-Control",
	`  Cache-Control: ${IMMUTABLE_CACHE_CONTROL}`,
];

/** Cloudflare reads any line starting with a path or URL as a rule, however it's indented. */
const isRule = (line: string) => /^(\/|https?:\/\/)/.test(line.trim());

/** Appends or replaces the assets' caching rule as the final `_headers` rule, preserving the project's other rules. */
const mergeAssetHeaders = (existing: string) => {
	const lines: string[] = [];
	let inOurRule = false;
	for (const line of existing.split("\n")) {
		if (isRule(line)) inOurRule = line.trim() === RULE;
		if (!inOurRule) lines.push(line);
	}

	const before = lines.join("\n").trimEnd();
	return `${before}${before ? "\n\n" : ""}${[RULE, ...HEADERS].join("\n")}\n`;
};

export default mergeAssetHeaders;
