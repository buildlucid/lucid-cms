import { expect, test } from "vitest";
import defineAgent from "../agent/define-agent.js";
import { agentTools, mcpTools } from "./lucid-tools.js";

test("bundles flatten into an agent's tools, which has nothing it does not list", () => {
	const agent = defineAgent({
		key: "research",
		name: "Research",
		description: "Researches topics.",
		tools: [agentTools.web(), agentTools.getDocument()],
	});
	expect(agent.tools.map((tool) => tool.name)).toEqual([
		"web_search",
		"web_fetch",
		"documents_get",
	]);
	expect(
		defineAgent({ key: "empty", name: "Empty", description: "None." }).tools,
	).toEqual([]);
	expect(mcpTools.content().map((tool) => tool.name)).toContain(
		"media_preview",
	);
});

test("web tools reject domains that are not public hostnames when the config loads", () => {
	expect(() =>
		agentTools.web({ allowedDomains: ["https://example.com"] }),
	).toThrow("public hostnames");
	expect(() =>
		agentTools.webSearch({ allowedDomains: [" Example.com "] }),
	).not.toThrow();
});
