import { expect, test, vi } from "vitest";
import defineAgent from "../agent/define-agent.js";
import processConfig from "../config/process-config.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import defineSkill from "./define-skill.js";

const adapter = {
	connect: vi.fn(),
	inferSchema: vi.fn(),
	dropAllTables: vi.fn(),
} as unknown as DatabaseAdapter;

const skill = (name: string) =>
	defineSkill({
		name,
		description: "Use when testing.",
		instructions: "Follow the test.",
		scopes: [],
	});
const agent = (key: string, skills: ReturnType<typeof skill>[]) =>
	defineAgent({ key, name: "Test", description: "Test", tools: [], skills });

test("a skill can be shared by MCP and several agents", async () => {
	const shared = skill("test-shared");
	const config = await processConfig(
		{
			secrets: "a".repeat(64),
			ai: {
				mcp: { skills: [shared] },
				agents: [agent("one", [shared]), agent("two", [shared])],
			},
		},
		{ resolvedDb: adapter },
	);
	expect(config.ai.mcp.skills).toEqual([shared]);
	expect(config.ai.agents.map((agent) => agent.skills)).toEqual([
		[shared],
		[shared],
	]);
});

test("rejects names clients cannot verify and duplicates within a placement", async () => {
	const options = { resolvedDb: adapter };
	await expect(
		processConfig(
			{
				secrets: "a".repeat(64),
				ai: { mcp: { skills: [skill("test_seo")] } },
			},
			options,
		),
	).rejects.toThrow('Invalid skill name "test_seo".');
	await expect(
		processConfig(
			{
				secrets: "a".repeat(64),
				ai: {
					agents: [agent("test", [skill("test-seo"), skill("test-seo")])],
				},
			},
			options,
		),
	).rejects.toThrow('Agent "test" registers skill "test-seo" more than once.');
});
