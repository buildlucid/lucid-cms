import { expect, test } from "vitest";
import defineAgent from "../agent/define-agent.js";
import defineRoutine from "../agent/define-routine.js";
import { getAgents } from "../agent/registry.js";
import type { AgentDefinition } from "../agent/types.js";
import { copy } from "../i18n/copy.js";
import { agentTools } from "../tools/lucid-tools.js";
import checkAgentDefinitions from "./checks/check-agent-definitions.js";
import ConfigSchema from "./config-schema.js";

const routine = defineRoutine({
	key: "weekly-audit",
	name: "Weekly audit",
	instructions: "Audit the site.",
	schedule: { cron: "0  9 * * 1" },
});
const agent = defineAgent({
	key: "seo",
	name: "SEO Agent",
	description: "Reviews metadata.",
	tools: [agentTools.read()],
	routines: [routine],
});
const check = (agents: AgentDefinition[]) => () =>
	checkAgentDefinitions(
		ConfigSchema.pick({ ai: true }).parse({
			ai: { agents: { definitions: agents } },
		}),
	);

test("MCP stays off until it is configured, and agents default to none", () => {
	const config = ConfigSchema.pick({ ai: true });
	expect(config.parse({}).ai).toMatchObject({
		mcp: { enabled: false, tools: [], skills: [] },
		agents: { enabled: true, definitions: [] },
	});
	expect(config.parse({ ai: { mcp: {} } }).ai.mcp.enabled).toBe(true);
	expect(config.parse({ ai: { mcp: false } }).ai.mcp.enabled).toBe(false);
	expect(config.parse({ ai: false }).ai.enabled).toBe(false);
});

test("agent shorthands resolve to the same config", () => {
	const schema = ConfigSchema.pick({ ai: true });
	const shorthand = schema.parse({ ai: { agents: [agent] } });
	const object = schema.parse({ ai: { agents: { definitions: [agent] } } });

	expect(shorthand.ai.agents).toEqual({ enabled: true, definitions: [agent] });
	expect(object.ai.agents).toEqual(shorthand.ai.agents);
	expect(schema.parse({ ai: { agents: false } }).ai.agents).toEqual({
		enabled: false,
		definitions: [],
	});
});

test("media generation takes a boolean for every type, or settings per type", () => {
	const schema = ConfigSchema.pick({ ai: true });
	const media = (mediaGeneration: unknown) =>
		schema.parse({ ai: { mediaGeneration } }).ai.mediaGeneration;

	expect(media(false)).toEqual({
		image: { enabled: false, models: {} },
		audio: { enabled: false, models: {} },
	});
	expect(
		media({ image: { models: { available: ["a", "b"] } }, audio: false }),
	).toEqual({
		image: { enabled: true, models: { available: ["a", "b"] } },
		audio: { enabled: false, models: {} },
	});
	expect(() =>
		media({ image: { models: { default: "c", available: ["a"] } } }),
	).toThrow("The default model must be one of the available models.");
});

test("only enabled agents are used, and only while their feature is on", () => {
	const off = defineAgent({
		key: "off",
		name: "Off",
		description: "Switched off.",
		enabled: false,
	});
	const resolve = (agentsEnabled = true, enabled = true) =>
		getAgents(
			ConfigSchema.pick({ ai: true }).parse({
				ai: {
					enabled,
					agents: { enabled: agentsEnabled, definitions: [agent, off] },
				},
			}),
		).map((item) => item.key);
	expect(resolve()).toEqual(["seo"]);
	expect(resolve(false)).toEqual([]);
	expect(resolve(true, false)).toEqual([]);
});

test("routines normalise their schedule and default to UTC", () => {
	expect(routine.conversationMode).toBe("new");
	expect(routine.schedule).toEqual({ cron: "0 9 * * 1", timezone: "UTC" });
});

test("routines can opt into reusing their chat", () => {
	const reusable = defineRoutine({
		key: "reuse",
		name: "Reuse",
		instructions: "Check things.",
		conversationMode: "reuse",
		schedule: { cron: "0 9 * * 1" },
	});
	expect(reusable.conversationMode).toBe("reuse");
	expect(
		check([
			defineAgent({
				key: "test",
				name: "Test",
				description: "Test",
				routines: [reusable],
			}),
		]),
	).not.toThrow();
});

test("suggestions normalise admin copy and reject empty messages", () => {
	const suggested = defineAgent({
		key: "suggested",
		name: "Suggested",
		description: "Helps editors.",
		suggestions: [
			{
				title: copy("admin:agent.suggestion.title"),
				description: "Find content to improve",
				message: "\n    Review the latest pages.\n    Suggest improvements.\n",
			},
		],
	});

	expect(check([suggested])).not.toThrow();
	expect(suggested.suggestions[0]).toMatchObject({
		title: { type: "lucid.copy", scope: "admin" },
		description: { type: "lucid.literal", value: "Find content to improve" },
		message: {
			type: "lucid.literal",
			value: "Review the latest pages.\nSuggest improvements.",
		},
	});
	expect(
		check([
			{
				...suggested,
				suggestions: [
					{
						...suggested.suggestions[0],
						message: copy.literal(" "),
					},
				],
			},
		]),
	).toThrow('Agent "suggested" suggestion 1 needs a message.');
});

test("agent and routine keys are unique and schedules must be valid", () => {
	expect(check([agent])).not.toThrow();
	expect(check([agent, agent])).toThrow(
		'Agent "seo" is registered more than once.',
	);
	expect(check([{ ...agent, key: "SEO" }])).toThrow('Invalid agent key "SEO".');
	expect(check([{ ...agent, routines: [routine, routine] }])).toThrow(
		'Routine "seo:weekly-audit" is registered more than once.',
	);
	expect(
		check([
			{
				...agent,
				routines: [{ ...routine, schedule: { cron: "* *", timezone: "UTC" } }],
			},
		]),
	).toThrow('Routine "seo:weekly-audit" has an invalid schedule.');
});

test("routine tool settings accept the agent's tools and reject unknown names", () => {
	expect(
		check([
			{
				...agent,
				routines: [
					{
						...routine,
						toolSettings: { collections_list: { requiresConfirmation: true } },
					},
				],
			},
		]),
	).not.toThrow();
	expect(
		check([
			{
				...agent,
				routines: [
					{
						...routine,
						toolSettings: { unknown_tool: { requiresConfirmation: false } },
					},
				],
			},
		]),
	).toThrow("must name tools");
});

test("builder editing needs builder reading", () => {
	const builder = (features: { read?: boolean; edit?: boolean }) =>
		check([
			defineAgent({
				key: "builder",
				name: "Builder",
				description: "Edits pages.",
				features: { builder: features },
			}),
		]);

	expect(builder({ read: false })).not.toThrow();
	expect(builder({ read: false, edit: true })).toThrow(
		"features.builder.edit without features.builder.read",
	);
});
