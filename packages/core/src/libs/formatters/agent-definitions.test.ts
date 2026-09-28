import { afterAll, expect, test } from "vitest";
import type { LucidAuth } from "../../types/hono.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import defineAgent from "../agent/define-agent.js";
import { copy } from "../i18n/copy.js";
import { getAgentPermission } from "../permission/agent-permissions.js";
import { agentTools } from "../tools/lucid-tools.js";
import agentFormatter from "./agent.js";

const testConfig = getTestConfig();
afterAll(testConfig.destroy);

const authUser = (permissions: string[]): LucidAuth => ({
	id: 1,
	username: "editor",
	email: "editor@test.local",
	superAdmin: false,
	permissions,
	exp: 0,
	iat: 0,
	nonce: "test",
});

test("agent details expose suggestions to users and tools to managers", async () => {
	const base = await testConfig.getConfig();
	const agent = defineAgent({
		key: "reviewer",
		name: "Reviewer",
		description: "Reviews content.",
		tools: [agentTools.content()],
		suggestions: [
			{
				title: copy("admin:review.title"),
				description: "Find work",
				message: "Review the latest pages.",
			},
		],
	});
	const config = {
		...base,
		ai: {
			...base.ai,
			enabled: true,
			features: { ...base.ai.features, agents: true },
			agents: { definitions: [agent] },
		},
	};
	const format = (permissions: string[]) =>
		agentFormatter.formatDefinitions({
			config,
			authUser: authUser(permissions),
			adminTranslations: { "review.title": "Review content" },
		});

	const user = format([getAgentPermission("reviewer", "use")]);
	expect(user.enabled).toBe(true);
	expect(user.agents[0]?.suggestions[0]).toMatchObject({
		title: { defaultMessage: "Review content" },
		message: { type: "lucid.literal", value: "Review the latest pages." },
	});
	expect(user.agents[0]?.tools.length).toBeGreaterThan(0);

	const manager = format([getAgentPermission("reviewer", "manage")]);
	expect(manager.agents[0]?.suggestions).toEqual([]);
	expect(manager.agents[0]?.tools.length).toBeGreaterThan(0);

	const noAccess = format([]);
	expect(noAccess.agents[0]).toMatchObject({ suggestions: [], tools: [] });
	expect(
		agentFormatter.formatDefinitions({
			config: {
				...config,
				ai: {
					...config.ai,
					features: { ...config.ai.features, agents: false },
				},
			},
			authUser: authUser([]),
			adminTranslations: {},
		}),
	).toEqual({ enabled: false, agents: [] });
});
