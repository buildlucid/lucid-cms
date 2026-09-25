import { expect, test, vi } from "vitest";
import processConfig from "../config/process-config.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import defineSkill from "./define-skill.js";
import { getSkillRegistry } from "./registry.js";

const adapter = {
	connect: vi.fn(),
	inferSchema: vi.fn(),
	dropAllTables: vi.fn(),
} as unknown as DatabaseAdapter;

const skill = (name: string) =>
	defineSkill({
		target: "mcp",
		name,
		description: "Use when testing.",
		instructions: "Follow the test.",
		scopes: [],
	});

test("applies plugin registration before disabling skills", async () => {
	const config = await processConfig(
		{
			secrets: "a".repeat(64),
			ai: {
				skills: {
					definitions: [skill("test-project")],
					disabled: ["test-plugin"],
				},
			},
			plugins: [
				{
					key: "test-plugin",
					lucid: "*",
					configure: (draft) => {
						draft.ai.skills.definitions.push(skill("test-plugin"));
					},
				},
			],
		},
		{ resolvedDb: adapter },
	);
	expect([...getSkillRegistry(config).keys()]).toEqual(["test-project"]);
});

test("rejects names clients cannot verify and unknown disable entries", async () => {
	const options = { resolvedDb: adapter };
	await expect(
		processConfig(
			{
				secrets: "a".repeat(64),
				ai: { skills: { definitions: [skill("test_seo")] } },
			},
			options,
		),
	).rejects.toThrow('Invalid skill name "test_seo".');
	await expect(
		processConfig(
			{
				secrets: "a".repeat(64),
				ai: { skills: { disabled: ["typo"] } },
			},
			options,
		),
	).rejects.toThrow('Disabled skill "typo" is not registered.');
});
