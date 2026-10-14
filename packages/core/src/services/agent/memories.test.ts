import { afterAll, beforeAll, expect, test } from "vitest";
import defineAgent from "../../libs/agent/define-agent.js";
import { createTranslationStore } from "../../libs/i18n/index.js";
import { getAgentPermission } from "../../libs/permission/agent-permissions.js";
import { Permissions } from "../../libs/permission/definitions.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import deleteMemories from "./delete-memories.js";
import getMemories from "./get-memories.js";
import getRunMemories from "./helpers/get-run-memories.js";
import resolveRunSetup from "./helpers/resolve-run-setup.js";
import saveMemory from "./save-memory.js";

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
							key: "writer",
							name: "Writer",
							description: "Writes.",
						}),
					],
				},
				memory: {
					personal: { enabled: true, limit: 2 },
					shared: { enabled: true, limit: 5 },
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

const chat = getAgentPermission("writer", "chat");

const save = async (
	userId: number,
	memory: { scope: "personal" | "shared"; content: string },
	replaces: string[] = [],
) => {
	const saved = await saveMemory(context, { userId, ...memory, replaces });
	if (saved.error) throw new Error(JSON.stringify(saved.error));
	return saved.data.id;
};

test("personal memories stay private, and only managers change shared ones", async () => {
	const editor = await createUser("memory-editor", [chat]);
	const admin = await createUser("memory-admin", [
		chat,
		Permissions.AiMemoriesManage,
	]);
	const outsider = await createUser("memory-outsider", [
		Permissions.AiMemoriesManage,
	]);
	expect((await getMemories(context, { userId: outsider })).error?.status).toBe(
		403,
	);

	const preference = await save(editor, {
		scope: "personal",
		content: "Reply in short bullet points.",
	});
	const rule = await save(admin, {
		scope: "shared",
		content: "Use British spelling.",
	});

	const denied = await saveMemory(context, {
		userId: editor,
		scope: "shared",
		content: "Call customers members.",
		replaces: [],
	});
	expect(denied.error?.status).toBe(403);
	expect(
		(await deleteMemories(context, { userId: editor, ids: [rule] })).error
			?.status,
	).toBe(404);
	expect(
		(await deleteMemories(context, { userId: admin, ids: [preference] })).error
			?.status,
	).toBe(404);

	const listed = await getMemories(context, { userId: admin });
	expect(listed.data?.personal.memories).toEqual([]);
	expect(listed.data?.shared.memories.map((memory) => memory.id)).toEqual([
		rule,
	]);

	//* runs acting as the system only follow shared memories
	const system = await getRunMemories(context, { userId: null });
	expect(system.data).toEqual({
		shared: {
			limit: 5,
			memories: [{ id: rule, content: "Use British spelling." }],
		},
		personal: null,
	});
});

test("replacing memories merges them into the first, and the limit counts what remains", async () => {
	const writer = await createUser("memory-writer", [chat]);
	const tone = await save(writer, { scope: "personal", content: "Be brief." });
	const format = await save(writer, {
		scope: "personal",
		content: "Use bullet points.",
	});

	const full = await saveMemory(context, {
		userId: writer,
		scope: "personal",
		content: "Sign off with my name.",
		replaces: [],
	});
	expect(full.error?.status).toBe(400);

	const merged = await save(
		writer,
		{ scope: "personal", content: "Be brief and use bullet points." },
		[tone, format],
	);
	expect(merged).toBe(tone);

	const listed = await getMemories(context, { userId: writer });
	expect(
		listed.data?.personal.memories.map((memory) => memory.content),
	).toEqual(["Be brief and use bullet points."]);
});

test("an approval reviewed before someone else's edit changes nothing", async () => {
	const admin = await createUser("memory-reviewer", [
		chat,
		Permissions.AiMemoriesManage,
	]);
	const rule = await save(admin, {
		scope: "shared",
		content: "Call customers members.",
	});
	const reviewed = [
		{ id: rule, scope: "shared" as const, content: "Call customers members." },
	];
	await save(admin, { scope: "shared", content: "Call customers clients." }, [
		rule,
	]);

	const update = await saveMemory(context, {
		userId: admin,
		scope: "shared",
		content: "Call customers patrons.",
		replaces: [rule],
		reviewed,
	});
	expect(update.error?.status).toBe(409);
	const forget = await deleteMemories(context, {
		userId: admin,
		ids: [rule],
		reviewed,
	});
	expect(forget.error?.status).toBe(409);

	const listed = await getMemories(context, { userId: admin });
	expect(
		listed.data?.shared.memories.find((memory) => memory.id === rule)?.content,
	).toBe("Call customers clients.");
});

test("agents only get memory tools when the person can save to a scope", async () => {
	const agent = defineAgent({
		key: "writer",
		name: "Writer",
		description: "Writes.",
	});
	const toolNames = (personal: boolean) =>
		resolveRunSetup(
			{
				...context,
				config: {
					...context.config,
					ai: {
						...context.config.ai,
						memory: {
							personal: { enabled: personal, limit: 2 },
							shared: { enabled: true, limit: 5 },
						},
					},
				},
			},
			{
				agent,
				authority: {
					principal: { type: "user", userId: 1 },
					permissions: [],
					superAdmin: false,
				},
				aiAccess: [],
				mode: "chat",
				hasHistory: false,
				memories: { shared: { limit: 5, memories: [] }, personal: null },
			},
		);

	expect(toolNames(true).tools.map((tool) => tool.name)).toContain(
		"lucid_memory_save",
	);
	const blocked = toolNames(false);
	expect(
		blocked.tools.some((tool) => tool.name.startsWith("lucid_memory_")),
	).toBe(false);
	expect(blocked.instructions).not.toContain("lucid_memory_save");
});
