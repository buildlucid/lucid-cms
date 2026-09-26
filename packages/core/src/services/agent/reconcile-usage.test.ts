import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import Migration00000014 from "../../libs/db/migrations/00000014-agent.js";
import { createTranslationStore } from "../../libs/i18n/index.js";
import { AiGenerationsRepository } from "../../libs/repositories/index.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import { formatDbTimestamp } from "../ai/helpers/date-helpers.js";
import insertConversation from "./helpers/insert-conversation.js";
import storePendingUsage from "./helpers/store-pending-usage.js";
import storeUsage from "./helpers/store-usage.js";
import reconcileUsage from "./reconcile-usage.js";
import startRun from "./start-run.js";

const request = vi.fn();
let connectionId = 0;
vi.mock("../connection/token-manager.js", () => ({
	default: async () => ({
		error: undefined,
		data: { accessToken: "test-token", lucidRemoteConnectionId: connectionId },
	}),
}));
vi.mock("../../libs/lucid-remote/client.js", () => ({
	getLucidRemoteClient: () => ({ request }),
}));

const testConfig = getTestConfig();
let context: ServiceContext;
let userId: number;
const usage = {
	model: "test-model",
	tokens: {
		input: {
			text: 1,
			image: 0,
			audio: 0,
			cached: { total: 0, text: 0, image: 0, audio: 0 },
			total: 1,
		},
		output: {
			text: 1,
			image: 0,
			audio: 0,
			reasoning: 0,
			acceptedPrediction: 0,
			rejectedPrediction: 0,
			total: 1,
		},
		total: 2,
	},
	cost: { creditsCharged: "0.0001" },
};

beforeAll(async () => {
	await testConfig.migrate();
	const config = await testConfig.getConfig();
	const database = await testConfig.getDatabase();
	const tables = await database.client.introspection.getTables();
	if (!tables.some((table) => table.name === "lucid_agent_runs")) {
		await Migration00000014(config.db).up(database.client);
	}
	context = createServiceContext({
		config: {
			...config,
			ai: { ...config.ai, enabled: true },
		},
		database,
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
	userId = (
		await database.client
			.insertInto("lucid_users")
			.values({
				email: "reconcile@example.test",
				username: "reconcile",
				secret: "test",
			})
			.returning("id")
			.executeTakeFirstOrThrow()
	).id;
	connectionId = (
		await database.client
			.insertInto("lucid_remote_connections")
			.values({ status: "connected" })
			.returning("id")
			.executeTakeFirstOrThrow()
	).id;
});
afterAll(() => testConfig.destroy());

const pending = async (old = true) => {
	const conversation = await insertConversation(context, {
		agentKey: "test",
		userId,
	});
	if (conversation.error) throw new Error(JSON.stringify(conversation.error));
	const run = await startRun(context, {
		userId,
		conversationId: conversation.data.id,
		text: "Test",
		requestId: randomUUID(),
	});
	if (run.error) throw new Error(JSON.stringify(run.error));
	const input = {
		requestId: randomUUID(),
		runId: run.data.runId,
		conversationId: conversation.data.id,
		userId,
		connectionId,
	};
	expect((await storePendingUsage(context, input)).error).toBeUndefined();
	if (old) {
		await (await testConfig.getDatabase()).client
			.updateTable("lucid_ai_generations")
			.set({
				created_at: formatDbTimestamp(new Date(Date.now() - 25 * 60_000)),
			})
			.where("request_id", "=", input.requestId)
			.execute();
	}
	return input;
};

test("reconciles a paid turn once and leaves its first usage immutable", async () => {
	const input = await pending();
	request.mockImplementation(async () => ({
		error: undefined,
		data: {
			json: { data: { requestId: input.requestId, status: "complete", usage } },
		},
	}));
	expect((await reconcileUsage(context)).data).toBe(1);
	expect((await reconcileUsage(context)).data).toBe(0);
	const retry = await storeUsage(context, {
		...input,
		usage: { ...usage, cost: { creditsCharged: "999" } },
		durationMs: 1,
	});
	expect(retry.error).toBeUndefined();
	const stored = await new AiGenerationsRepository(
		context.db,
	).selectSingleByRequestId({
		requestId: input.requestId,
		select: ["status", "credits_charged", "duration_ms"],
	});
	expect(stored.data).toMatchObject({
		status: "success",
		credits_charged: "0.0001",
		duration_ms: null,
	});
});

test("closes an old missing request without a charge", async () => {
	const input = await pending();
	request.mockResolvedValue({
		error: { type: "basic", status: 404, message: "Not found" },
		data: undefined,
	});
	expect((await reconcileUsage(context)).data).toBe(1);
	expect(
		(
			await storeUsage(context, {
				...input,
				usage,
				durationMs: 1,
			})
		).error,
	).toBeUndefined();
	const stored = await new AiGenerationsRepository(
		context.db,
	).selectSingleByRequestId({
		requestId: input.requestId,
		select: ["status", "credits_charged"],
	});
	expect(stored.data).toMatchObject({
		status: "failed",
		credits_charged: null,
	});
});

test("settles a fresh billed failure even while the remote request is processing", async () => {
	const input = await pending(false);
	request.mockResolvedValue({
		error: undefined,
		data: {
			json: {
				data: { requestId: input.requestId, status: "processing", usage },
			},
		},
	});
	expect(
		(await reconcileUsage(context, { requestId: input.requestId })).data,
	).toBe(1);
	const stored = await new AiGenerationsRepository(
		context.db,
	).selectSingleByRequestId({
		requestId: input.requestId,
		select: ["status", "credits_charged"],
	});
	expect(stored.data).toMatchObject({
		status: "success",
		credits_charged: "0.0001",
	});
});

test.each([
	"failed",
	"cancelled",
])("closes a fresh confirmed unbilled %s request", async (status) => {
	const input = await pending(false);
	request.mockResolvedValue({
		error: undefined,
		data: { json: { data: { requestId: input.requestId, status } } },
	});
	expect(
		(await reconcileUsage(context, { requestId: input.requestId })).data,
	).toBe(1);
	const stored = await new AiGenerationsRepository(
		context.db,
	).selectSingleByRequestId({
		requestId: input.requestId,
		select: ["status", "credits_charged"],
	});
	expect(stored.data).toMatchObject({
		status: "failed",
		credits_charged: null,
	});
});

test.each([
	"processing",
	"complete",
])("keeps a fresh %s request without usage pending", async (status) => {
	const input = await pending(false);
	request.mockResolvedValue({
		error: undefined,
		data: { json: { data: { requestId: input.requestId, status } } },
	});

	expect(
		(await reconcileUsage(context, { requestId: input.requestId })).data,
	).toBe(0);
	const stored = await new AiGenerationsRepository(
		context.db,
	).selectSingleByRequestId({
		requestId: input.requestId,
		select: ["status", "credits_charged"],
	});
	expect(stored.data).toMatchObject({
		status: "pending",
		credits_charged: null,
	});
});

test("keeps a fresh missing request pending because creation may still be racing", async () => {
	const input = await pending(false);
	request.mockResolvedValue({
		error: { type: "basic", status: 404, message: "Not found" },
		data: undefined,
	});
	expect(
		(await reconcileUsage(context, { requestId: input.requestId })).data,
	).toBe(0);
	const stored = await new AiGenerationsRepository(
		context.db,
	).selectSingleByRequestId({
		requestId: input.requestId,
		select: ["status"],
	});
	expect(stored.data?.status).toBe("pending");
});
