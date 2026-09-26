import { expect, test } from "vitest";
import defineAgent from "../agent/define-agent.js";
import defineRoutine from "../agent/define-routine.js";
import type { AgentDefinition } from "../agent/types.js";
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
	tools: [],
	routines: [routine],
});
const check = (agents: AgentDefinition[]) => () =>
	checkAgentDefinitions({ ai: { agents } });

test("MCP stays off until configured, and agents default to none", () => {
	const config = ConfigSchema.pick({ ai: true });
	expect(config.parse({}).ai).toMatchObject({
		mcp: { enabled: false, tools: [], skills: [] },
		agents: [],
	});
	expect(config.parse({ ai: { mcp: {} } }).ai.mcp.enabled).toBe(true);
	expect(config.parse({ ai: false }).ai.enabled).toBe(false);
});

test("routines normalise their schedule and default to UTC", () => {
	expect(routine.schedule).toEqual({ cron: "0 9 * * 1", timezone: "UTC" });
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
