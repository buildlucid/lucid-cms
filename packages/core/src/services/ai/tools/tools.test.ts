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
import { outputSchema } from "./usage/schema.js";

const fixture = getTestConfig();

let context: ServiceContext;
let operator: number;

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
});
afterAll(() => fixture.destroy());

const callAgent = (
	input: unknown,
	permissions: string[] = [Permissions.SettingsRead],
) => {
	const runId = randomUUID();
	return executeAgentTool({
		context,
		tool: agentTools.getAiUsage(),
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

test("reads only the parts asked for, totalling the chart over the given range", async () => {
	//* credits need the AI connection, so they are left out here
	const result = await callAgent({
		include: ["sessions", "chart"],
		chart: {
			startDate: "2026-10-01",
			endDate: "2026-10-07",
			metrics: ["credits", "requests"],
		},
	});
	assert(result.type === "success", JSON.stringify(result));
	const usage = outputSchema.parse(result.data.output);
	expect(usage.credits).toBeNull();
	expect(usage.sessions).toEqual({
		data: [],
		pagination: { count: 0, page: 1, perPage: 20, nextPage: null },
	});
	expect(usage.chart).toMatchObject({
		dimension: "day",
		metrics: ["credits", "requests"],
		startDate: "2026-10-01",
		endDate: "2026-10-07",
		totals: { credits: 0, requests: 0, sessions: 0, totalTokens: 0 },
	});
	expect(usage.chart?.series[0]?.points).toHaveLength(7);

	expect(
		await callAgent({
			include: ["chart"],
			chart: { startDate: "2026-10-07", endDate: "2026-10-01" },
		}),
	).toMatchObject({ type: "failed" });
	expect(await callAgent({ include: ["sessions"] }, [])).toMatchObject({
		type: "forbidden",
	});
});
