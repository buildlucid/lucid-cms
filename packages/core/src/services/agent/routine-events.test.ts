import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import defineAgent from "../../libs/agent/define-agent.js";
import { matchesRoutineEvent } from "../../libs/agent/routine-events.js";
import { createTranslationStore } from "../../libs/i18n/index.js";
import { Permissions } from "../../libs/permission/definitions.js";
import { AgentMessagesRepository } from "../../libs/repositories/index.js";
import type { MediaType } from "../../types/response.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import createRoutine from "./create-routine.js";
import dispatchEventRoutines from "./dispatch-event-routines.js";
import insertConversation from "./helpers/insert-conversation.js";
import recordRoutineEvent from "./helpers/record-routine-event.js";
import startRun from "./helpers/start-run.js";

const testConfig = getTestConfig();
let context: ServiceContext;
afterAll(testConfig.destroy);

beforeAll(async () => {
	await testConfig.migrate();
	const config = await testConfig.getConfig();
	context = createServiceContext({
		config: {
			...config,
			ai: {
				...config.ai,
				agents: {
					enabled: true,
					definitions: [
						defineAgent({
							key: "seo",
							name: "seo",
							description: "seo",
							tools: [],
						}),
					],
				},
			},
		},
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
});

const createUser = async (username: string, permissions: string[]) => {
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({ email: `${username}@test.local`, username, secret: "test" })
		.returning("id")
		.executeTakeFirstOrThrow();
	const role = await context.db.kysely
		.insertInto("lucid_roles")
		.values({ name: username, description: null, key: null, locked: false })
		.returning("id")
		.executeTakeFirstOrThrow();
	await context.db.kysely
		.insertInto("lucid_user_roles")
		.values({ user_id: user.id, role_id: role.id })
		.execute();
	await context.db.kysely
		.insertInto("lucid_role_permissions")
		.values(
			permissions.map((permission) => ({
				role_id: role.id,
				permission,
				core: true,
			})),
		)
		.execute();
	return user.id;
};

const insertMedia = async (type: MediaType) => {
	const media = await context.db.kysely
		.insertInto("lucid_media")
		.values({
			key: randomUUID(),
			storage_adapter_key: "test",
			origin: "human",
			type,
			mime_type: type === "image" ? "image/png" : "audio/mpeg",
			file_extension: type === "image" ? "png" : "mp3",
			file_name: type === "image" ? "photo.png" : "intro.mp3",
			file_size: 1,
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	return media.id;
};

const pending = (routineId: string) =>
	context.db.kysely
		.selectFrom("lucid_agent_routine_pending")
		.select(["event", "subject_type", "subject_id"])
		.where("routine_id", "=", routineId)
		.execute();

test("routine events match every filter they set, and missing filters match everything", () => {
	const trigger = {
		event: "requests:approved",
		filter: { collections: ["page"], requestTypes: ["publish"] },
	} as const;

	expect(
		matchesRoutineEvent(trigger, "requests:approved", {
			collections: ["blog", "page"],
			requestType: "publish",
		}),
	).toBe(true);
	expect(
		matchesRoutineEvent(trigger, "requests:approved", {
			collections: ["page"],
			requestType: "delete",
		}),
	).toBe(false);
	expect(
		matchesRoutineEvent(trigger, "requests:completed", {
			collections: ["page"],
			requestType: "publish",
		}),
	).toBe(false);
	expect(
		matchesRoutineEvent({ event: "media:updated" }, "media:updated", {}),
	).toBe(true);
	expect(
		matchesRoutineEvent(
			{ event: "media:updated", filter: { fields: ["file"] } },
			"media:updated",
			{ mediaType: "image", fields: [] },
		),
	).toBe(false);
});

test("content changes queue for matching routines and start one run once they settle", async () => {
	const userId = await createUser("events", [
		"agents:seo:chat",
		"agents:seo:manage-own-routines",
		Permissions.MediaRead,
	]);
	const routine = await createRoutine(context, {
		userId,
		agentKey: "seo",
		name: "Alt text",
		instructions: "Write alt text for new images.",
		schedule: null,
		events: [{ event: "media:created", filter: { mediaTypes: ["image"] } }],
		enabled: true,
	});
	if (routine.error) throw new Error(JSON.stringify(routine.error));
	expect(routine.data).toMatchObject({ schedule: null, nextRunAt: null });

	const image = await insertMedia("image");
	const audio = await insertMedia("audio");
	for (const [mediaId, mediaType] of [
		[image, "image"],
		[image, "image"],
		[audio, "audio"],
	] as const) {
		const recorded = await recordRoutineEvent(context, {
			event: "media:created",
			subjects: [{ type: "media", mediaId }],
			facts: { mediaType },
		});
		expect(recorded.error).toBeUndefined();
	}

	//* Runs in routine conversations do not queue further routine events.
	const conversation = await insertConversation(context, {
		agentKey: "seo",
		userId,
		routineId: routine.data.id,
	});
	if (conversation.error) throw new Error(JSON.stringify(conversation.error));
	const routineRun = randomUUID();
	await context.db.kysely
		.insertInto("lucid_agent_runs")
		.values({
			id: routineRun,
			conversation_id: conversation.data.id,
			routine_id: routine.data.id,
			status: "completed",
		})
		.execute();
	await recordRoutineEvent(context, {
		event: "media:created",
		subjects: [{ type: "media", mediaId: await insertMedia("image") }],
		facts: { mediaType: "image" },
		agentRunId: routineRun,
	});

	expect(await pending(routine.data.id)).toEqual([
		{ event: "media:created", subject_type: "media", subject_id: image },
	]);

	expect(await dispatchEventRoutines(context)).toMatchObject({ data: 0 });
	await context.db.kysely
		.updateTable("lucid_agent_routine_pending")
		.set({ last_at: new Date(Date.now() - 120_000).toISOString() })
		.where("routine_id", "=", routine.data.id)
		.execute();
	expect(await dispatchEventRoutines(context)).toMatchObject({ data: 1 });
	expect(await pending(routine.data.id)).toEqual([]);

	const run = await context.db.kysely
		.selectFrom("lucid_agent_runs")
		.select("id")
		.where("routine_id", "=", routine.data.id)
		.where("id", "!=", routineRun)
		.executeTakeFirstOrThrow();
	const AgentMessages = new AgentMessagesRepository(context.db);
	const request = await AgentMessages.selectSingle({
		select: ["parts"],
		where: [{ key: "id", operator: "=", value: run.id }],
	});
	expect(
		request.data?.parts.find((part) => part.type === "context"),
	).toMatchObject({ timezone: "UTC", actingFor: { userId, name: "events" } });
	expect(
		request.data?.parts.find((part) => part.type === "routine"),
	).toMatchObject({
		trigger: "event",
		events: [
			{
				reference: { type: "media", mediaId: image },
				events: ["media:created"],
			},
		],
	});

	expect(await dispatchEventRoutines(context)).toMatchObject({ data: 0 });
});

test("documents with the same ID in different collections queue separately", async () => {
	const userId = await createUser("collections", [
		"agents:seo:chat",
		"agents:seo:manage-own-routines",
	]);
	const routine = await createRoutine(context, {
		userId,
		agentKey: "seo",
		name: "Review edits",
		instructions: "Review edited documents.",
		schedule: null,
		events: [{ event: "documents:updated" }],
		enabled: true,
	});
	if (routine.error) throw new Error(JSON.stringify(routine.error));

	for (const collectionKey of ["pages", "articles", "pages"]) {
		const recorded = await recordRoutineEvent(context, {
			event: "documents:updated",
			subjects: [{ type: "document", collectionKey, documentId: 1 }],
			facts: { collections: [collectionKey] },
		});
		expect(recorded.error).toBeUndefined();
	}

	const rows = await context.db.kysely
		.selectFrom("lucid_agent_routine_pending")
		.select(["collection_key", "subject_id"])
		.where("routine_id", "=", routine.data.id)
		.orderBy("collection_key")
		.execute();
	expect(rows).toEqual([
		{ collection_key: "articles", subject_id: 1 },
		{ collection_key: "pages", subject_id: 1 },
	]);
});

test("repeated changes keep what earlier ones touched", async () => {
	const userId = await createUser("fields", [
		"agents:seo:chat",
		"agents:seo:manage-own-routines",
	]);
	const routine = await createRoutine(context, {
		userId,
		agentKey: "seo",
		name: "Image checks",
		instructions: "Check updated images.",
		schedule: null,
		events: [{ event: "media:updated" }],
		enabled: true,
	});
	if (routine.error) throw new Error(JSON.stringify(routine.error));

	const mediaId = await insertMedia("image");
	for (const fields of [["file"] as const, [] as const]) {
		await recordRoutineEvent(context, {
			event: "media:updated",
			subjects: [{ type: "media", mediaId }],
			facts: { mediaType: "image", fields },
		});
	}

	const row = await context.db.kysely
		.selectFrom("lucid_agent_routine_pending")
		.select("fields")
		.where("routine_id", "=", routine.data.id)
		.executeTakeFirstOrThrow();
	expect(row.fields).toEqual(["file"]);
});

test("chat messages keep the sender's timezone for the agent", async () => {
	const userId = await createUser("timezone", ["agents:seo:chat"]);
	const conversation = await insertConversation(context, {
		agentKey: "seo",
		userId,
	});
	if (conversation.error) throw new Error(JSON.stringify(conversation.error));

	const runId = randomUUID();
	const started = await startRun(context, {
		conversationId: conversation.data.id,
		userId,
		runId,
		text: "What changed this week?",
		timezone: "Europe/London",
	});
	expect(started.error).toBeUndefined();

	const AgentMessages = new AgentMessagesRepository(context.db);
	const message = await AgentMessages.selectSingle({
		select: ["parts"],
		where: [{ key: "id", operator: "=", value: runId }],
	});
	expect(
		message.data?.parts.find((part) => part.type === "context"),
	).toMatchObject({
		timezone: "Europe/London",
		actingFor: { userId, name: "timezone" },
	});
});

vi.mock("./helpers/enqueue-run.js", () => ({
	default: vi.fn(async () => ({ error: undefined, data: undefined })),
}));

vi.mock("../connection/token-manager.js", () => ({
	default: async () => ({
		error: undefined,
		data: { accessToken: "test-token", lucidRemoteConnectionId: 1 },
	}),
}));
