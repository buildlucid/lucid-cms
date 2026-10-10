import { randomUUID } from "node:crypto";
import { afterAll, assert, beforeAll, expect, test } from "vitest";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import { executeAgentTool } from "../../../libs/tools/execute-tool.js";
import { agentTools } from "../../../libs/tools/lucid-tools.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import syncLocales from "../../sync/sync-locales.js";
import { outputSchema } from "./get/schema.js";

const fixture = getTestConfig();

let context: ServiceContext;
let operator: number;

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		//* an unset env var leaves the sender address undefined, which the tool must not return
		config: {
			...config,
			email: { ...config.email, from: { name: "Support", email: undefined } },
		},
		database: await fixture.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: { en: { admin: {}, server: {} } },
		}),
	});
	await fixture.migrate();
	expect((await syncLocales(context)).error).toBeUndefined();

	//* the system and MCP sections check the person's live permissions, so the role matters here
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: `${randomUUID()}@example.test`,
			username: randomUUID(),
			secret: "test",
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	operator = user.id;
	const role = await context.db.kysely
		.insertInto("lucid_roles")
		.values({ name: randomUUID(), description: null, key: null, locked: false })
		.returning("id")
		.executeTakeFirstOrThrow();
	await context.db.kysely
		.insertInto("lucid_user_roles")
		.values({ user_id: operator, role_id: role.id })
		.execute();
	await context.db.kysely
		.insertInto("lucid_role_permissions")
		.values({
			role_id: role.id,
			permission: Permissions.SettingsRead,
			core: true,
		})
		.execute();
});
afterAll(() => fixture.destroy());

const callAgent = (
	input: unknown,
	permissions: string[] = [Permissions.SettingsRead],
) => {
	const runId = randomUUID();
	return executeAgentTool({
		context,
		tool: agentTools.getSettings(),
		input,
		execution: {
			authority: {
				principal: { type: "user", userId: operator },
				permissions,
				superAdmin: false,
			},
			actor: { kind: "user", userId: operator, agentRunId: runId },
			signal: AbortSignal.timeout(10_000),
			operationId: `${runId}:${randomUUID()}`,
			run: {
				id: runId,
				conversationId: randomUUID(),
				userId: operator,
				agentKey: "test",
			},
		},
	});
};

test("reads every section by default and only the sections asked for", async () => {
	const everything = await callAgent({});
	assert(everything.type === "success", JSON.stringify(everything));
	const settings = outputSchema.parse(everything.data.output).data;
	expect(Object.keys(settings).toSorted()).toEqual([
		"ai",
		"email",
		"mcp",
		"media",
		"system",
	]);
	//* the test context has no runtime adapter, so the runtime is unknown
	expect(settings.system).toMatchObject({
		runtime: null,
		database: context.config.db.adapter,
		queue: context.queue.key,
	});
	expect(settings.email).toEqual({
		simulated: true,
		templates: expect.any(Array),
		from: { name: "Support" },
	});

	const email = await callAgent({ includes: ["email"] });
	assert(email.type === "success", JSON.stringify(email));
	expect(Object.keys(email.data.output.data)).toEqual(["email"]);

	expect(await callAgent({}, [])).toMatchObject({ type: "forbidden" });
});
