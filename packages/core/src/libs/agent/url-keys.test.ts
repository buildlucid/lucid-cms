import { expect, test } from "vitest";
import type { StoredAgentMessagePart } from "../../schemas/agent.js";
import { copy } from "../i18n/index.js";
import runnerTools from "./runner-tools.js";
import {
	addWebUrlKeys,
	messageUrlKeys,
	webSourceKey,
	webUrlKey,
} from "./url-keys.js";

const tool = (name: string, output: unknown): StoredAgentMessagePart => ({
	type: "tool",
	id: "call",
	name,
	status: "complete",
	summary: copy.literal("Read the source."),
	input: { url: "https://invented.example.com/input" },
	output,
});

test("URL keys match mentions loosely but never a changed query string", () => {
	const keys = addWebUrlKeys(
		new Set<string>(),
		'See example.com/about, or [docs](https://docs.example.com/guide?page=2#intro). {"url":"https://www.example.org/"}',
	);
	for (const url of [
		"https://www.example.com/about/",
		"http://docs.example.com/guide?page=2",
		"https://example.org",
	]) {
		expect(keys.has(webUrlKey(url) ?? "")).toBe(true);
	}
	expect(keys.has(webUrlKey("https://example.com/about?q=secret") ?? "")).toBe(
		false,
	);
	expect(webSourceKey("https://example.com/a?utm_source=x&id=1")).toBe(
		webUrlKey("https://example.com/a?id=1"),
	);
});

test("large tool payloads and incomplete hostname chains do not hide a following URL", () => {
	const text = `${"x".repeat(128_000)} ${"a.".repeat(5_000)} [source](https://example.com/page?id=2).`;
	expect([...addWebUrlKeys(new Set<string>(), text)]).toEqual([
		"example.com/page?id=2",
	]);
});

test("only user text and trusted tool outputs establish URL provenance", () => {
	const text: StoredAgentMessagePart = {
		type: "text",
		text: "Read https://www.example.com/page/?id=2#section",
	};
	expect([...messageUrlKeys({ role: "user", parts: [text] })]).toEqual([
		"example.com/page?id=2",
	]);
	expect([...messageUrlKeys({ role: "assistant", parts: [text] })]).toEqual([]);
	expect([
		...messageUrlKeys({
			role: "assistant",
			parts: [tool("documents_get", { content: ["https://example.com/file"] })],
		}),
	]).toEqual(["example.com/file"]);
});

test.each([
	runnerTools.history.name,
	runnerTools.progress.name,
	runnerTools.skill.name,
	runnerTools.finish.name,
	"media_analyze",
])("%s cannot establish URL provenance by echoing an input", (name) => {
	expect([
		...messageUrlKeys({
			role: "assistant",
			parts: [tool(name, { url: "https://example.com/file" })],
		}),
	]).toEqual([]);
});
