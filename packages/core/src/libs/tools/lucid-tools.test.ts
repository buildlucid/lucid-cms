import { expect, test } from "vitest";
import defineAgent from "../agent/define-agent.js";
import { agentTools, mcpTools } from "./lucid-tools.js";

const options = {
	key: "research",
	name: "Research",
	description: "Researches topics.",
};

test("built-in features are enabled by default and explicit bundles flatten", () => {
	const agent = defineAgent({ ...options, tools: [agentTools.content()] });
	expect(agent.tools.map((tool) => tool.name)).toEqual([
		"media_analyze",
		"media_read_file",
		"web_search",
		"web_fetch",
		"media_remove_ownership",
		...agentTools.content().map((tool) => tool.name),
	]);
	expect(mcpTools.content().map((tool) => tool.name)).toContain(
		"media_preview",
	);
});

test("all features can be disabled without registering supporting tools", () => {
	const agent = defineAgent({
		...options,
		features: {
			media: { upload: false, attach: false, analyze: false, readFile: false },
			documents: { attach: false },
			web: { search: false, read: false },
		},
	});
	expect(agent.tools).toEqual([]);
});

test("library promotion follows uploads, as personal files only come from them", () => {
	const promotion = (media: { upload: boolean; attach: boolean }) =>
		defineAgent({ ...options, features: { media } }).tools.find(
			(tool) => tool.name === "media_remove_ownership",
		);
	expect(promotion({ upload: true, attach: false })?.requiresApproval).toBe(
		true,
	);
	expect(promotion({ upload: false, attach: true })).toBeUndefined();
});

test("web features reject invalid domains when the config loads", () => {
	expect(() =>
		defineAgent({
			...options,
			features: { web: { allowedDomains: ["https://example.com"] } },
		}),
	).toThrow("public hostnames");
	expect(() =>
		defineAgent({
			...options,
			features: { web: { allowedDomains: [" Example.com "] } },
		}),
	).not.toThrow();
});
