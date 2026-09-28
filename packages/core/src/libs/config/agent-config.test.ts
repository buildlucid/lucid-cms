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
	tools: [agentTools.content()],
	routines: [routine],
});
const check = (agents: AgentDefinition[]) => () =>
	checkAgentDefinitions(
		ConfigSchema.pick({ ai: true }).parse({
			ai: { agents: { definitions: agents } },
		}),
	);

test("MCP stays off until its feature is switched on, and agents default to none", () => {
	const config = ConfigSchema.pick({ ai: true });
	expect(config.parse({}).ai).toMatchObject({
		features: { agents: true, mcp: false },
		mcp: { tools: [], skills: [] },
		agents: { definitions: [] },
	});
	expect(config.parse({ ai: { mcp: {} } }).ai.features.mcp).toBe(false);
	expect(config.parse({ ai: false }).ai.enabled).toBe(false);
});

test("agent arrays and objects resolve to the same config", () => {
	const schema = ConfigSchema.pick({ ai: true });
	const shorthand = schema.parse({ ai: { agents: [agent] } });
	const object = schema.parse({ ai: { agents: { definitions: [agent] } } });

	expect(shorthand.ai.agents).toEqual({ definitions: [agent] });
	expect(object.ai.agents).toEqual(shorthand.ai.agents);
	expect(schema.parse({ ai: { agents: {} } }).ai.agents).toEqual({
		definitions: [],
	});
});

test("only enabled agents are used, and only while their feature is on", () => {
	const off = defineAgent({
		key: "off",
		name: "Off",
		description: "Switched off.",
		enabled: false,
	});
	const resolve = (features: { agents?: boolean }, enabled = true) =>
		getAgents(
			ConfigSchema.pick({ ai: true }).parse({
				ai: { enabled, features, agents: [agent, off] },
			}),
		).map((item) => item.key);
	expect(resolve({})).toEqual(["seo"]);
	expect(resolve({ agents: false })).toEqual([]);
	expect(resolve({}, false)).toEqual([]);
});

test("routines normalise their schedule and default to UTC", () => {
	expect(routine.schedule).toEqual({ cron: "0 9 * * 1", timezone: "UTC" });
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

test("routine tools accept the agent's tools and reject unknown names", () => {
	expect(
		check([
			{
				...agent,
				routines: [
					{
						...routine,
						tools: { collections_list: { requiresApproval: true } },
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
						tools: { unknown_tool: { requiresApproval: false } },
					},
				],
			},
		]),
	).toThrow("must name tools");
});
