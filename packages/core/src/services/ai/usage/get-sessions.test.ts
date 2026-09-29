import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, test } from "vitest";
import defineAgent from "../../../libs/agent/define-agent.js";
import Migration00000014 from "../../../libs/db/migrations/00000014-agent.js";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import insertConversation from "../../agent/helpers/insert-conversation.js";
import storeUsage from "../../agent/helpers/store-usage.js";
import startRun from "../../agent/start-run.js";
import storeGeneration from "../storage/store-generation.js";
import getSession from "./get-session.js";
import getSessionRecords from "./get-session-records.js";
import getSessions from "./get-sessions.js";

const testConfig = getTestConfig();
let context: ServiceContext;
let ownerId: number;
let otherId: number;
let connectionId: number;

const usage = (credits: string) => ({
	model: "test-model",
	tokens: {
		input: {
			text: 3,
			image: 0,
			audio: 0,
			cached: { total: 0, text: 0, image: 0, audio: 0 },
			total: 3,
		},
		output: {
			text: 2,
			image: 0,
			audio: 0,
			reasoning: 0,
			acceptedPrediction: 0,
			rejectedPrediction: 0,
			total: 2,
		},
		total: 5,
	},
	cost: { creditsCharged: credits },
});

const insertUser = async (username: string) => {
	const database = await testConfig.getDatabase();
	return (
		await database.client
			.insertInto("lucid_users")
			.values({
				email: `${username}@example.test`,
				username,
				secret: "test",
				super_admin: context.config.db.getDefault("boolean", "true"),
			})
			.returning("id")
			.executeTakeFirstOrThrow()
	).id;
};

const storeImage = async (sessionId: string | undefined, credits: string) => {
	const requestId = randomUUID();
	await storeGeneration(context, {
		lucidRemoteConnectionId: connectionId,
		userId: ownerId,
		session: { type: "media-image", id: sessionId },
		response: {
			mode: "sync",
			requestId,
			feature: { key: "media.image.generate", version: "v1" },
			output: {},
			usage: usage(credits),
		},
		requestStartedAt: Date.now(),
	});
	return requestId;
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
			ai: {
				...config.ai,
				agents: {
					definitions: [
						defineAgent({ key: "test", name: "Test", description: "Tests." }),
					],
				},
			},
		},
		database,
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
	ownerId = await insertUser("usage-owner");
	otherId = await insertUser("usage-other");
	connectionId = (
		await database.client
			.insertInto("lucid_remote_connections")
			.values({ status: "connected" })
			.returning("id")
			.executeTakeFirstOrThrow()
	).id;
});
afterAll(() => testConfig.destroy());

test("groups requests into sessions and links chats only for their owner", async () => {
	const conversation = await insertConversation(context, {
		agentKey: "test",
		userId: ownerId,
	});
	if (conversation.error) throw new Error(JSON.stringify(conversation.error));
	const run = await startRun(context, {
		userId: ownerId,
		conversationId: conversation.data.id,
		text: "Test",
		requestId: randomUUID(),
	});
	if (run.error) throw new Error(JSON.stringify(run.error));

	for (const credits of ["2", "3"]) {
		const stored = await storeUsage(context, {
			requestId: randomUUID(),
			featureKey: "agent.chat",
			runId: run.data.runId,
			conversationId: conversation.data.id,
			userId: ownerId,
			connectionId,
			usage: usage(credits),
			durationMs: 10,
		});
		expect(stored.error).toBeUndefined();
	}
	const imageSessionId = randomUUID();
	const imageRequestId = await storeImage(imageSessionId, "4");
	await storeImage(imageSessionId, "4");
	//* without a session id, a request is a session of its own
	await storeImage(undefined, "1");

	const owned = await getSessions(context, {
		query: {},
		viewerId: ownerId,
	});
	expect(owned.data?.count).toBe(3);
	expect(owned.data?.data).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				type: "agent",
				id: conversation.data.id,
				//* the first message names the chat
				conversation: { id: conversation.data.id, title: "Test" },
				credits: 5,
				tokens: { input: 6, output: 4, total: 10 },
				requests: expect.objectContaining({ total: 2, failed: 0 }),
				user: expect.objectContaining({ id: ownerId }),
			}),
			expect.objectContaining({
				type: "media-image",
				id: imageSessionId,
				conversation: null,
				credits: 8,
			}),
			expect.objectContaining({ type: "media-image", credits: 1 }),
		]),
	);

	const found = await getSessions(context, {
		query: { filter: { requestId: { value: imageRequestId, operator: "=" } } },
		viewerId: ownerId,
	});
	expect(found.data?.count).toBe(1);
	expect(found.data?.data).toMatchObject([
		{ id: imageSessionId, requests: { total: 2 } },
	]);

	const other = await getSession(context, {
		type: "agent",
		id: conversation.data.id,
		viewerId: otherId,
	});
	expect(other.data?.conversation).toBeNull();

	const records = await getSessionRecords(context, {
		type: "agent",
		id: conversation.data.id,
		query: {},
	});
	expect(records.data?.count).toBe(2);
	expect(records.data?.data).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				runId: run.data.runId,
				credits: 2,
				usage: {
					kind: "model",
					model: "test-model",
					tokens: { input: 3, output: 2, total: 5 },
				},
			}),
		]),
	);
});
