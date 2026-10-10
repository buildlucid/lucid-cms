import { randomUUID } from "node:crypto";
import { afterAll, assert, beforeAll, expect, test } from "vitest";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import { notifications } from "../../../libs/notifications/lucid-notifications.js";
import { executeAgentTool } from "../../../libs/tools/execute-tool.js";
import { agentTools } from "../../../libs/tools/lucid-tools.js";
import type { AgentToolExecution } from "../../../libs/tools/types.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import syncLocales from "../../sync/sync-locales.js";
import send from "../send.js";
import { outputSchema } from "./find/schema.js";

const fixture = getTestConfig();

let context: ServiceContext;
let operator: number;
let author: number;

const createUser = async () => {
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: `${randomUUID()}@example.test`,
			username: randomUUID(),
			secret: "test",
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	return user.id;
};

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config,
		database: await fixture.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: { en: { admin: {}, server: {} } },
		}),
	});
	await fixture.migrate();
	expect((await syncLocales(context)).error).toBeUndefined();
	operator = await createUser();
	author = await createUser();
});
afterAll(() => fixture.destroy());

const callAgent = (
	input: unknown,
	principal: AgentToolExecution["authority"]["principal"] = {
		type: "user",
		userId: operator,
	},
) => {
	const runId = randomUUID();
	return executeAgentTool({
		context,
		tool: agentTools.findNotifications(),
		input,
		execution: {
			authority: { principal, permissions: [], superAdmin: false },
			actor:
				principal.type === "user"
					? { kind: "user", userId: principal.userId, agentRunId: runId }
					: { kind: "system", agentRunId: runId },
			signal: AbortSignal.timeout(10_000),
			operationId: `${runId}:${randomUUID()}`,
			run: {
				id: runId,
				conversationId: randomUUID(),
				userId: principal.type === "user" ? principal.userId : null,
				agentKey: "test",
			},
		},
	});
};

test("finds the person's own notifications with a link, and routines have none", async () => {
	const sent = await send(context, {
		definition: notifications.requests.reviewRequested,
		recipients: [operator],
		actorUserId: author,
		data: { requestId: 7, title: "Spring launch" },
	});
	assert(sent.data?.id, JSON.stringify(sent.error));

	const found = await callAgent({
		query: { filter: [{ key: "status", value: "unread" }] },
	});
	assert(found.type === "success", JSON.stringify(found));
	const { data } = outputSchema.parse(found.data.output);
	expect(data).toEqual([
		expect.objectContaining({
			id: sent.data.id,
			type: "requests:review-requested",
			category: "requests",
			actionRequired: true,
			actor: { id: author, name: expect.any(String) },
			link: expect.stringMatching(/\/lucid\/requests\/7$/),
		}),
	]);

	expect(await callAgent({}, { type: "system" })).toMatchObject({
		type: "failed",
	});
});
