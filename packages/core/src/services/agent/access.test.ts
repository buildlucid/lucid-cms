import { afterAll, beforeAll, expect, test, vi } from "vitest";
import defineAgent from "../../libs/agent/define-agent.js";
import defineRoutine from "../../libs/agent/define-routine.js";
import { createTranslationStore } from "../../libs/i18n/index.js";
import { getAgentPermission } from "../../libs/permission/agent-permissions.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import syncAgentRoutines from "../sync/sync-agent-routines.js";
import createConversation from "./create-conversation.js";
import createRoutine from "./create-routine.js";
import deleteRoutine from "./delete-routine.js";
import dispatchDueRoutines from "./dispatch-due-routines.js";
import executeRun from "./execute-run.js";
import getConversation from "./get-conversation.js";
import getConversations from "./get-conversations.js";
import getModels from "./get-models.js";
import getRoutine from "./get-routine.js";
import getRoutines from "./get-routines.js";
import insertConversation from "./helpers/insert-conversation.js";
import runRoutine from "./run-routine.js";
import updateRoutine from "./update-routine.js";

const testConfig = getTestConfig();
let context: ServiceContext;
afterAll(testConfig.destroy);

const agent = (key: string) =>
	defineAgent({
		key,
		name: key,
		description: key,
		tools: [],
		routines: [
			defineRoutine({
				key: "audit",
				name: "Weekly audit",
				instructions: "Audit the site.",
				schedule: { cron: "0 9 * * 1" },
			}),
		],
	});

beforeAll(async () => {
	await testConfig.migrate();
	const config = await testConfig.getConfig();
	context = createServiceContext({
		config: {
			...config,
			ai: {
				...config.ai,
				agents: { definitions: [agent("seo"), agent("copy")] },
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
	if (permissions.length > 0) {
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
	}
	return user.id;
};

test("chats are private, and code routine chats are shared with the agent's managers", async () => {
	const editor = await createUser("editor", [
		getAgentPermission("seo", "chat"),
		getAgentPermission("copy", "chat"),
	]);
	const manager = await createUser("manager", [
		getAgentPermission("seo", "manage-code-routines"),
	]);

	const chat = async (agentKey: string, userId: number | null) => {
		const created = await insertConversation(context, { agentKey, userId });
		if (created.error) throw new Error(JSON.stringify(created.error));
		return created.data.id;
	};
	const own = await chat("seo", editor);
	const ownCopy = await chat("copy", editor);
	const managersOnly = await chat("seo", null);
	const otherAgent = await chat("copy", null);
	const listed = async (userId: number) =>
		(
			await getConversations(context, {
				userId,
				query: { page: 1, perPage: 10 },
			})
		).data?.data
			.map((conversation) => conversation.id)
			.sort();

	expect(await listed(editor)).toEqual([own, ownCopy].sort());
	expect(await listed(manager)).toEqual([managersOnly]);

	expect(
		(await getConversation(context, { id: managersOnly, userId: manager })).data
			?.userId,
	).toBeNull();
	for (const [id, userId] of [
		[own, manager],
		[managersOnly, editor],
		[otherAgent, manager],
	] as const) {
		expect(
			(await getConversation(context, { id, userId })).error?.status,
		).toBeGreaterThanOrEqual(403);
	}
});

test.each([
	{ name: "chat-only", permissions: ["agents:seo:chat"] },
	{ name: "code-manager", permissions: ["agents:seo:manage-code-routines"] },
	{
		name: "other-agent",
		permissions: ["agents:seo:chat", "agents:copy:manage-own-routines"],
	},
])("routine creation refuses $name access", async ({ name, permissions }) => {
	const userId = await createUser(name, permissions);
	const result = await createRoutine(context, {
		userId,
		agentKey: "seo",
		name,
		instructions: "Review the site.",
		cron: "0 9 * * *",
		timezone: "UTC",
		enabled: true,
	});
	expect(result).toMatchObject({ error: { status: 403 } });
	expect(
		await context.db.kysely
			.selectFrom("lucid_agent_routines")
			.select("id")
			.where("user_id", "=", userId)
			.execute(),
	).toEqual([]);
});

test("personal routines work independently of chats and code routines", async () => {
	const userId = await createUser("routine-creator", [
		"agents:seo:manage-own-routines",
	]);
	const managerId = await createUser("routine-manager", [
		"agents:seo:manage-code-routines",
	]);
	const created = await createRoutine(context, {
		userId,
		agentKey: "seo",
		name: "My audit",
		instructions: "Review the site.",
		cron: "0 9 * * *",
		timezone: "UTC",
		enabled: true,
	});
	expect(created.error).toBeUndefined();
	if (created.error) throw new Error(JSON.stringify(created.error));
	expect(
		await context.db.kysely
			.selectFrom("lucid_agent_routines")
			.select(["source", "user_id"])
			.where("id", "=", created.data.id)
			.executeTakeFirstOrThrow(),
	).toEqual({ source: "database", user_id: userId });
	expect(
		await createConversation(context, { agentKey: "seo", userId }),
	).toMatchObject({ error: { status: 403 } });
	expect(
		(await getModels(context, { agentKey: "seo", userId })).error,
	).toBeUndefined();
	expect(
		await updateRoutine(context, {
			id: created.data.id,
			userId,
			name: "Updated audit",
		}),
	).toMatchObject({ data: { name: "Updated audit" } });
	const run = await runRoutine(context, { id: created.data.id, userId });
	expect(run.error).toBeUndefined();
	if (run.error) throw new Error(JSON.stringify(run.error));
	expect(
		(
			await getConversations(context, {
				userId,
				query: { page: 1, perPage: 10 },
			})
		).data?.data.map((chat) => chat.id),
	).toEqual([run.data.conversationId]);

	expect(
		await getRoutine(context, { id: created.data.id, userId: managerId }),
	).toMatchObject({ error: { status: 404 } });

	expect((await syncAgentRoutines(context)).error).toBeUndefined();
	const listed = await getRoutines(context, {
		userId: managerId,
		query: { page: 1, perPage: 10 },
	});
	const codeRoutine = listed.data?.data[0];
	expect(codeRoutine?.source).toBe("code");
	if (!codeRoutine) throw new Error("Expected the manager's code routine");
	expect(
		await updateRoutine(context, {
			id: codeRoutine.id,
			userId,
			enabled: false,
		}),
	).toMatchObject({ error: { status: 403 } });
	expect(
		await updateRoutine(context, {
			id: codeRoutine.id,
			userId: managerId,
			enabled: false,
		}),
	).toMatchObject({ data: { enabled: false } });

	await context.db.kysely
		.deleteFrom("lucid_role_permissions")
		.where("permission", "=", "agents:seo:manage-own-routines")
		.execute();
	expect(
		await updateRoutine(context, {
			id: created.data.id,
			userId,
			enabled: false,
		}),
	).toMatchObject({ error: { status: 403 } });
});

test("revoking personal routine access blocks scheduled and queued runs while preserving chat access", async () => {
	const userId = await createUser("revoked-routines", [
		"agents:seo:chat",
		"agents:seo:manage-own-routines",
	]);
	const routine = await createRoutine(context, {
		userId,
		agentKey: "seo",
		name: "Scheduled audit",
		instructions: "Review the site.",
		cron: "0 9 * * *",
		timezone: "UTC",
		enabled: true,
	});
	if (routine.error) throw new Error(JSON.stringify(routine.error));
	const markDue = () =>
		context.db.kysely
			.updateTable("lucid_agent_routines")
			.set({ next_run_at: new Date(Date.now() - 60_000).toISOString() })
			.where("id", "=", routine.data.id)
			.execute();
	await markDue();
	expect(await dispatchDueRoutines(context)).toMatchObject({ data: 1 });
	const queued = await context.db.kysely
		.selectFrom("lucid_agent_runs")
		.select(["id", "conversation_id"])
		.where("routine_id", "=", routine.data.id)
		.executeTakeFirstOrThrow();
	await context.db.kysely
		.deleteFrom("lucid_role_permissions")
		.where("permission", "=", "agents:seo:manage-own-routines")
		.execute();
	expect(await executeRun(context, { runId: queued.id })).toMatchObject({
		data: { status: "failed" },
	});
	await markDue();
	expect(await dispatchDueRoutines(context)).toMatchObject({ data: 0 });
	expect(
		await context.db.kysely
			.selectFrom("lucid_agent_runs")
			.select("id")
			.where("routine_id", "=", routine.data.id)
			.execute(),
	).toHaveLength(1);
	expect(
		await getConversation(context, { id: queued.conversation_id, userId }),
	).toMatchObject({ error: { status: 403 } });
	expect(
		await runRoutine(context, { id: routine.data.id, userId }),
	).toMatchObject({ error: { status: 403 } });
	expect(
		(await createConversation(context, { userId, agentKey: "seo" })).error,
	).toBeUndefined();
});

test("deleting a personal routine preserves its chat's workflow permission", async () => {
	const userId = await createUser("routine-history", [
		"agents:seo:chat",
		"agents:seo:manage-own-routines",
	]);
	const routine = await createRoutine(context, {
		userId,
		agentKey: "seo",
		name: "History audit",
		instructions: "Review the site.",
		cron: "0 9 * * *",
		timezone: "UTC",
		enabled: false,
	});
	if (routine.error) throw new Error(JSON.stringify(routine.error));
	const chat = await insertConversation(context, {
		userId,
		agentKey: "seo",
		routineId: routine.data.id,
	});
	if (chat.error) throw new Error(JSON.stringify(chat.error));
	expect(
		(await deleteRoutine(context, { id: routine.data.id, userId })).error,
	).toBeUndefined();
	expect(
		await getConversation(context, { id: chat.data.id, userId }),
	).toMatchObject({ data: { routineId: null } });
	await context.db.kysely
		.deleteFrom("lucid_role_permissions")
		.where("permission", "=", "agents:seo:manage-own-routines")
		.execute();
	expect(
		await getConversation(context, { id: chat.data.id, userId }),
	).toMatchObject({ error: { status: 403 } });
	expect(
		(
			await getConversations(context, {
				userId,
				query: { page: 1, perPage: 10 },
			})
		).data?.data,
	).toEqual([]);
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

vi.mock("../../libs/lucid-remote/services/get-agent-models.js", async () => ({
	default: (
		await import("../../utils/test-helpers/agent-models.js")
	).mockAgentModels(),
}));
