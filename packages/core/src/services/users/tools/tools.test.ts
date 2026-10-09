import { randomUUID } from "node:crypto";
import { afterAll, assert, beforeAll, expect, test } from "vitest";
import applyCollectionMigrations from "../../../libs/collection/apply-collection-migrations.js";
import CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import planCollectionMigrations from "../../../libs/collection/plan-collection-migrations.js";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import { ExternalScopes } from "../../../libs/permission/external-scopes.js";
import createToolkit from "../../../libs/toolkit/create-toolkit.js";
import {
	executeAgentTool,
	executeMcpTool,
} from "../../../libs/tools/execute-tool.js";
import { agentTools, mcpTools } from "../../../libs/tools/lucid-tools.js";
import type { AgentToolDefinition } from "../../../libs/tools/types.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import syncCollections from "../../sync/sync-collections.js";
import syncLocales from "../../sync/sync-locales.js";
import { outputSchema } from "./find/schema.js";

const fixture = getTestConfig();
const collection = (key: string) =>
	new CollectionBuilder(key, {
		mode: "multiple",
		details: { labels: { singular: "Page", plural: "Pages" } },
		publishing: { targets: [{ key: "production", label: "Production" }] },
	}).addText("title", { useAsLabel: true });
const pages = collection("user_tool_pages");
const posts = collection("user_tool_posts");

let context: ServiceContext;
let admin: number;
let editor: number;
let manager: number;
let reviewer: number;
let ada: number;
let grace: number;
let deleted: number;

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: {
			...config,
			collections: [pages, posts],
			ai: {
				...config.ai,
				features: { ...config.ai.features, mcp: true },
				mcp: { tools: [mcpTools.findUsers()], skills: [] },
			},
		},
		database: await fixture.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: { en: { admin: {}, server: {} } },
		}),
	});
	await fixture.migrate();
	expect((await syncLocales(context)).error).toBeUndefined();
	expect((await syncCollections(context)).error).toBeUndefined();
	const plan = await planCollectionMigrations(context);
	assert(plan.data, JSON.stringify(plan.error));
	expect(
		(await applyCollectionMigrations(context, plan.data)).error,
	).toBeUndefined();

	admin = await insertUser({ first_name: "Admin", super_admin: true });
	editor = await insertUser({ first_name: "Editor" }, [
		getCollectionPermission(pages.key, "read"),
	]);
	manager = await insertUser({ first_name: "Manager" }, [
		Permissions.UsersUpdate,
	]);
	reviewer = await insertUser({ first_name: "Reviewer" }, [
		Permissions.RequestsRead,
		getCollectionPermission(pages.key, "read"),
		getCollectionPermission(pages.key, "update"),
		getCollectionPermission(pages.key, "review"),
	]);
	ada = await insertUser({
		first_name: "Ada",
		last_name: "Lovelace",
		invitation_accepted: false,
	});
	grace = await insertUser({ first_name: "Grace", last_name: "Hopper" });
	deleted = await insertUser({
		first_name: "Ada",
		last_name: "Byron",
		is_deleted: true,
	});
});
afterAll(() => fixture.destroy());

const insertUser = async (
	values: {
		first_name: string;
		last_name?: string;
		super_admin?: boolean;
		invitation_accepted?: boolean;
		is_deleted?: boolean;
	},
	permissions: string[] = [],
) => {
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: `${randomUUID()}@example.test`,
			username: randomUUID(),
			secret: "test",
			invitation_accepted: true,
			...values,
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	if (permissions.length === 0) return user.id;

	const role = await context.db.kysely
		.insertInto("lucid_roles")
		.values({ name: randomUUID(), description: null, key: null, locked: false })
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

/** Calls an agent tool for a person, with the run's permissions limited to the given ones. */
const callAgent = (
	userId: number,
	input: unknown,
	options: {
		tool?: AgentToolDefinition;
		permissions?: string[];
	} = {},
) => {
	const runId = randomUUID();
	return executeAgentTool({
		context,
		tool: options.tool ?? agentTools.findUsers(),
		input,
		execution: {
			authority: {
				principal: { type: "user", userId },
				permissions: options.permissions ?? [],
				superAdmin: options.permissions === undefined,
			},
			actor: { kind: "user", userId, agentRunId: runId },
			signal: AbortSignal.timeout(10_000),
			operationId: `${runId}:${randomUUID()}`,
			run: {
				id: runId,
				conversationId: randomUUID(),
				userId,
				agentKey: "test",
			},
		},
	});
};

const findAs = async (
	userId: number,
	input: unknown,
	options?: Parameters<typeof callAgent>[2],
) => {
	const result = await callAgent(userId, input, options);
	assert(result.type === "success", JSON.stringify(result));
	return outputSchema.parse(result.data.output).data;
};

const createRequest = async (collectionKey = pages.key) => {
	const document = await createToolkit(context).documents.createSingle({
		collectionKey,
		actor: { kind: "system" },
		data: { fields: { title: "Hello" } },
	});
	assert(document.data, JSON.stringify(document.error));
	const request = await createToolkit(context).requests.createSingle({
		actor: { kind: "user", userId: admin },
		type: "publish",
		title: "Launch",
		documents: [
			{
				collectionKey,
				documentId: document.data.id,
				source: "latest",
				targets: ["production"],
			},
		],
	});
	assert(request.data, JSON.stringify(request.error));
	return request.data.id;
};

test("finds people by name without emails, showing status only to people who manage users", async () => {
	const query = { query: { filter: [{ key: "name", value: "ada lov" }] } };

	expect(await findAs(editor, query)).toEqual([
		{
			id: ada,
			name: "Ada Lovelace",
			username: expect.any(String),
			profilePicture: null,
		},
	]);
	expect(await findAs(manager, query)).toEqual([
		expect.objectContaining({ id: ada, status: "invited" }),
	]);

	const named = await findAs(editor, {
		query: { filter: [{ key: "id", value: [ada, grace, deleted] }] },
	});
	expect(named.map((user) => user.name)).toEqual([
		"Ada Lovelace",
		"Grace Hopper",
	]);

	//* models fill optional fields, so an empty sort keeps the default
	const sorted = await findAs(editor, {
		query: { filter: [{ key: "id", value: [reviewer, ada] }], sort: [] },
	});
	expect(sorted.map((user) => user.id)).toEqual([ada, reviewer]);
});

test("name compares the trimmed full name and username, and exclusions exclude both", async () => {
	const alice = await insertUser({ first_name: "Alice" });
	const find = async (value: string, operator: string) =>
		(
			await findAs(editor, {
				query: {
					filter: [
						{ key: "id", value: [ada, grace, alice] },
						{ key: "name", value, operator },
					],
				},
			})
		).map((user) => user.id);
	const username = (
		await findAs(editor, { query: { filter: [{ key: "id", value: [ada] }] } })
	)[0]?.username;
	assert(username);

	expect(await find("Alice", "=")).toEqual([alice]);
	expect(await find("alice", "ends-with")).toEqual([alice]);
	expect(await find("Ada Lovelace", "!=")).toEqual([alice, grace]);
	expect(await find(username, "!=")).toEqual([alice, grace]);
	expect(await find("lovelace", "not-contains")).toEqual([alice, grace]);
});

test("canReview lists people who can approve a request in reach, leaving out its creator", async () => {
	const requestId = await createRequest();
	const reviewers = (
		await findAs(admin, {
			query: { filter: [{ key: "canReview", value: requestId }] },
		})
	).map((user) => user.id);
	expect(reviewers).toContain(reviewer);
	expect(reviewers).not.toContain(admin);
	expect(reviewers).not.toContain(editor);

	expect(
		await findAs(admin, {
			query: {
				filter: [
					{ key: "canReview", value: requestId },
					{ key: "name", value: "Reviewer" },
				],
			},
		}),
	).toEqual([expect.objectContaining({ id: reviewer })]);

	//* the request's documents must be in the tool's collections
	expect(
		await callAgent(
			admin,
			{ query: { filter: [{ key: "canReview", value: requestId }] } },
			{ tool: agentTools.findUsers({ collections: [posts.key] }) },
		),
	).toMatchObject({ type: "failed" });
	//* reading requests needs requests:read, even when finding people doesn't
	expect(
		await callAgent(
			reviewer,
			{ query: { filter: [{ key: "canReview", value: requestId }] } },
			{ permissions: [] },
		),
	).toMatchObject({ type: "forbidden" });
	for (const filter of [
		[{ key: "canReview", value: "latest" }],
		[
			{ key: "canReview", value: requestId },
			{ key: "canReview", value: requestId + 1 },
		],
		[{ key: "canReview", value: requestId, operator: "!=" }],
	]) {
		expect(await callAgent(admin, { query: { filter } })).toMatchObject({
			type: "invalid-input",
		});
	}

	const toolkitReviewers = await createToolkit(context).requests.getReviewers({
		id: requestId,
	});
	assert(toolkitReviewers.data, JSON.stringify(toolkitReviewers.error));
	expect(toolkitReviewers.data.map((user) => user.id)).toEqual(
		expect.arrayContaining(reviewers),
	);
});

test("MCP finds people with users:list and needs requests:read for canReview", async () => {
	const requestId = await createRequest();
	const call = (
		scopes: string[],
		input: unknown,
		principal: { type: "user"; userId: number } | { type: "system" } = {
			type: "user",
			userId: admin,
		},
	) =>
		executeMcpTool({
			context,
			name: "users_find",
			input,
			execution: {
				authority: {
					principal,
					scopes: [ExternalScopes.McpAccess, ...scopes],
				},
				signal: AbortSignal.timeout(10_000),
			},
		});
	const canReview = {
		query: { filter: [{ key: "canReview", value: requestId }] },
	};

	expect(
		await call([], { query: { filter: [{ key: "name", value: "grace" }] } }),
	).toMatchObject({ type: "forbidden" });
	expect(
		await call([ExternalScopes.UsersList], {
			query: { filter: [{ key: "name", value: "grace" }] },
		}),
	).toMatchObject({
		type: "success",
		data: {
			output: { data: [{ id: grace, name: "Grace Hopper", status: "joined" }] },
		},
	});
	//* system integrations read as a super admin, so they don't get account status
	const asSystem = await call(
		[ExternalScopes.UsersList],
		{ query: { filter: [{ key: "name", value: "grace" }] } },
		{ type: "system" },
	);
	assert(asSystem.type === "success", JSON.stringify(asSystem));
	expect(asSystem.data.output).toMatchObject({ data: [{ id: grace }] });
	expect(asSystem.data.output).not.toHaveProperty("data.0.status");
	expect(await call([ExternalScopes.UsersList], canReview)).toMatchObject({
		type: "forbidden",
	});
	//* without read access to the collection, the request is out of reach
	expect(
		await call(
			[ExternalScopes.UsersList, ExternalScopes.RequestsRead],
			canReview,
		),
	).toMatchObject({ type: "failed" });
	expect(
		await call(
			[
				ExternalScopes.UsersList,
				ExternalScopes.RequestsRead,
				ExternalScopes.DocumentRead(pages.key),
			],
			canReview,
		),
	).toMatchObject({ type: "success" });
});

test("toolkit reads users with what the actor could see in the admin", async () => {
	const users = createToolkit(context).users;
	const query = { filter: { name: { value: "grace hop" } } };

	const asEditor = await users.getMultiple({
		actor: { kind: "user", userId: editor },
		query,
	});
	assert(asEditor.data, JSON.stringify(asEditor.error));
	expect(asEditor.data.count).toBe(1);
	expect(asEditor.data.data[0]).not.toHaveProperty("invitationAccepted");

	const asSystem = await users.getMultiple({ query });
	assert(asSystem.data, JSON.stringify(asSystem.error));
	expect(asSystem.data.data[0]).toMatchObject({
		id: grace,
		invitationAccepted: true,
	});

	expect(await users.getSingle({ id: deleted })).toMatchObject({
		data: { id: deleted, isDeleted: true },
	});
});
