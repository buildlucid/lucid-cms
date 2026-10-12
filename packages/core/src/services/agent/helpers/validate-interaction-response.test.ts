import { randomUUID } from "node:crypto";
import { afterAll, expect, test } from "vitest";
import constants from "../../../constants/constants.js";
import defineAgent from "../../../libs/agent/define-agent.js";
import { createInteraction } from "../../../libs/agent/interactions.js";
import type { Checkpoint } from "../../../libs/agent/types.js";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import { getAgentPermission } from "../../../libs/permission/agent-permissions.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import type { SessionRun } from "./run-session.js";
import validateInteractionResponse from "./validate-interaction-response.js";

const testConfig = getTestConfig();
afterAll(testConfig.destroy);

test("only the person a run acts for can answer it", async () => {
	await testConfig.migrate();
	const config = await testConfig.getConfig();
	const agent = defineAgent({
		key: "review",
		name: "Review",
		description: "Review content",
		tools: [],
	});
	const context = createServiceContext({
		config: {
			...config,
			ai: { ...config.ai, agents: { enabled: true, definitions: [agent] } },
		},
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			config: { defaultLocale: "en", locales: ["en"] },
			core: {},
		}),
	});
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({ email: "review@test.local", username: "review", secret: "test" })
		.returning("id")
		.executeTakeFirstOrThrow();
	const role = await context.db.kysely
		.insertInto("lucid_roles")
		.values({ name: "Reviewers", description: null, key: null, locked: false })
		.returning("id")
		.executeTakeFirstOrThrow();
	await context.db.kysely
		.insertInto("lucid_user_roles")
		.values({ user_id: user.id, role_id: role.id })
		.execute();
	await context.db.kysely
		.insertInto("lucid_role_permissions")
		.values({
			role_id: role.id,
			permission: getAgentPermission(agent.key, "manage-code-routines"),
			core: true,
		})
		.execute();
	const pending = createInteraction({
		callId: "write",
		key: constants.agent.widgets.confirmation,
		title: "Confirm write",
		data: {},
		confirmation: { toolName: "write", input: {} },
	});
	const checkpoint: Checkpoint = {
		version: 1,
		confirmationMode: "tool-defaults",
		messages: [],
		turns: 0,
		nudges: 0,
		requestId: randomUUID(),
		messageId: randomUUID(),
		parts: [],
		calls: [],
		cursor: 0,
		phase: "tools",
		pending,
	};
	//* a follow-up in a code routine's chat acts for the person who sent it
	const run: SessionRun = {
		id: randomUUID(),
		conversation_id: randomUUID(),
		routine_id: null,
		user_id: user.id,
		execution_version: 0,
		agent_key: agent.key,
		conversation_user_id: null,
		conversation_kind: "code-routine",
		conversation_routine_id: null,
	};
	const answer = (userId: number | null) =>
		validateInteractionResponse(context, {
			run: { ...run, user_id: userId },
			checkpoint,
			pending,
			action: "submit",
			response: {},
			userId: user.id,
		});

	expect(await answer(user.id)).toMatchObject({
		data: { action: "submit", response: {} },
	});
	expect((await answer(null)).error?.status).toBe(403);
	expect((await answer(user.id + 1)).error?.status).toBe(403);
});
