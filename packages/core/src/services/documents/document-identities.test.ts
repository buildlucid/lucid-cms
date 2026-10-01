import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import {
	afterAll,
	afterEach,
	assert,
	beforeAll,
	expect,
	test,
	vi,
} from "vitest";
import constants from "../../constants/constants.js";
import applyCollectionMigrations from "../../libs/collection/apply-collection-migrations.js";
import CollectionBuilder from "../../libs/collection/builders/collection-builder/index.js";
import planCollectionMigrations from "../../libs/collection/plan-collection-migrations.js";
import {
	getBricksTableSchema,
	getTableNames,
} from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { copy, createTranslationStore } from "../../libs/i18n/index.js";
import { getJobDefinitionRuntime } from "../../libs/jobs/registry.js";
import { DocumentVersionsRepository } from "../../libs/repositories/index.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import insertConversation from "../agent/helpers/insert-conversation.js";
import registerReferences from "../agent/references/register.js";
import { deleteCollectionJob } from "../collections/jobs/delete-single.js";
import cloneVersion from "../documents-versions/clone-version.js";
import { deleteExpiredRevisionsJob } from "../documents-versions/jobs/delete-expired-revisions.js";
import promoteVersion from "../documents-versions/promote-version.js";
import syncCollections from "../sync/sync-collections.js";
import deleteMultiplePermanently from "./delete-multiple-permanently.js";
import deleteSingle from "./delete-single.js";
import deleteSinglePermanently from "./delete-single-permanently.js";
import restoreMultiple from "./restore-multiple.js";
import upsertSingle from "./upsert-single.js";

const fixture = getTestConfig();
const collections = [
	"identity_pages",
	"identity_articles",
	"identity_revisions",
].map((key) =>
	new CollectionBuilder(key, {
		mode: "multiple",
		revisions: { enabled: key === "identity_revisions" },
		details: { labels: { singular: "Page", plural: "Pages" } },
		publishing: {
			workflow: {
				initial: "draft",
				stages: [
					{
						key: "draft",
						label: copy("admin:tests.draft", { defaultMessage: "Draft" }),
					},
				],
			},
		},
	})
		.addText("title", { validation: { required: true } })
		.addRelation("related", {
			collection: ["identity_pages", "identity_articles", "identity_revisions"],
			multiple: true,
		}),
);
const collectionKey = "identity_pages";
let context: ServiceContext;
let userId: number;
let conversationId: string;
const changes: Array<{ collectionKey: string; ids: number[]; type?: string }> =
	[];

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: {
			...config,
			collections,
			hooks: [
				{
					service: "documents",
					event: "afterChange",
					handler: async ({ meta, data }) => {
						changes.push({
							collectionKey: meta.collectionKey,
							ids: data.ids,
							type: data.change?.type,
						});
						return { error: undefined, data: undefined };
					},
				},
			],
		},
		database: await fixture.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: { en: { admin: {}, server: {} } },
		}),
	});
	await fixture.migrate();
	expect((await syncCollections(context)).error).toBeUndefined();
	const plan = await planCollectionMigrations(context);
	assert(plan.data, JSON.stringify(plan.error));
	expect(
		(await applyCollectionMigrations(context, plan.data)).error,
	).toBeUndefined();
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: "identities@example.test",
			username: "identities",
			secret: "test",
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	userId = user.id;
	const conversation = await insertConversation(context, {
		agentKey: "test",
		userId: null,
	});
	assert(conversation.data);
	conversationId = conversation.data.id;
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => fixture.destroy());

const create = async (key = collectionKey) => {
	const result = await upsertSingle(context, {
		collectionKey: key,
		userId: null,
		fields: [{ key: "title", type: "text", value: "Test" }],
	});
	assert(result.data, JSON.stringify(result.error));
	return result.data;
};
const saveRelated = async (
	documentId: number,
	targets: Array<{ id: number; collectionKey: string }>,
	key = collectionKey,
) => {
	const result = await upsertSingle(context, {
		collectionKey: key,
		documentId,
		userId: null,
		fields: [
			{ key: "title", type: "text", value: "Related" },
			{ key: "related", type: "relation", value: targets },
		],
	});
	assert(result.data, JSON.stringify(result.error));
};
const relationTable = async (key = collectionKey) => {
	const schema = await getBricksTableSchema(context, key);
	assert(schema.data, JSON.stringify(schema.error));
	const table = schema.data.find(
		(table) => table.key.fieldPath?.at(-1) === "related",
	);
	assert(table);
	return table.name;
};
const identity = (documentId: number, key = collectionKey) =>
	context.db.kysely
		.selectFrom("lucid_document_identities")
		.selectAll()
		.where("collection_key", "=", key)
		.where("document_id", "=", documentId)
		.execute();
const dependants = async (documentId: number, key = collectionKey) => {
	const workflow = await context.db.kysely
		.selectFrom("lucid_document_workflows")
		.select("id")
		.where("collection_key", "=", key)
		.where("document_id", "=", documentId)
		.executeTakeFirstOrThrow();
	await context.db.kysely
		.insertInto("lucid_document_workflow_assignees")
		.values({ workflow_id: workflow.id, user_id: userId })
		.execute();
	await context.db.kysely
		.insertInto("lucid_preview_sessions")
		.values({
			token_hash: randomUUID(),
			entry_collection_key: key,
			entry_document_id: documentId,
			entry_version_type: "latest",
			mode: "perspective",
			expires_at: "2099-01-01T00:00:00.000Z",
		})
		.execute();
	expect(
		(
			await registerReferences(context, {
				conversationId,
				references: [{ type: "document", collectionKey: key, documentId }],
				source: { type: "message" },
			})
		).error,
	).toBeUndefined();
	return workflow.id;
};
const remaining = async (
	documentId: number,
	workflowId: number,
	key = collectionKey,
) => {
	const db = context.db.kysely;
	return {
		identities: (await identity(documentId, key)).length,
		workflows: (
			await db
				.selectFrom("lucid_document_workflows")
				.select("id")
				.where("id", "=", workflowId)
				.execute()
		).length,
		assignees: (
			await db
				.selectFrom("lucid_document_workflow_assignees")
				.select("id")
				.where("workflow_id", "=", workflowId)
				.execute()
		).length,
		references: (
			await db
				.selectFrom("lucid_agent_document_references")
				.select("id")
				.where("collection_key", "=", key)
				.where("document_id", "=", documentId)
				.execute()
		).length,
		previews: (
			await db
				.selectFrom("lucid_preview_sessions")
				.select("id")
				.where("entry_collection_key", "=", key)
				.where("entry_document_id", "=", documentId)
				.execute()
		).length,
	};
};
const allPresent = {
	identities: 1,
	workflows: 1,
	assignees: 1,
	references: 1,
	previews: 1,
};
const allRemoved = {
	identities: 0,
	workflows: 0,
	assignees: 0,
	references: 0,
	previews: 0,
};

test("relation constraints survive schema introspection without generating migration drift", async () => {
	const table = await relationTable();
	const schema = await context.config.db.inferSchema(context.db.kysely);
	expect(schema.find((item) => item.name === table)?.foreignKeys).toEqual([
		{
			columns: ["_collection_key", "_document_id"],
			table: "lucid_document_identities",
			references: ["collection_key", "document_id"],
			onDelete: "cascade",
			onUpdate: "no action",
		},
	]);
	const plan = await planCollectionMigrations(context);
	assert(plan.data, JSON.stringify(plan.error));
	expect(
		plan.data.collections.flatMap((item) => item.migrationPlan.tables),
	).toEqual([]);
});

test("identity deletion scopes cascades by collection and collection deletion removes its identities", async () => {
	const first = await create();
	const otherKey = "identity_articles";
	const other = await create(otherKey);
	expect(other).toBe(first);
	const firstWorkflow = await dependants(first);
	const otherWorkflow = await dependants(other, otherKey);
	const owner = await create();
	await saveRelated(owner, [
		{ id: first, collectionKey },
		{ id: other, collectionKey: otherKey },
	]);
	const table = await relationTable();
	await expect(
		context.db.kysely
			.updateTable(table)
			.set({ _document_id: 999999 })
			.where("document_id", "=", owner)
			.execute(),
	).rejects.toThrow(/FOREIGN KEY/);
	await context.db.kysely
		.deleteFrom("lucid_document_identities")
		.where("collection_key", "=", otherKey)
		.where("document_id", "=", other)
		.execute();
	expect(await remaining(other, otherWorkflow, otherKey)).toEqual(allRemoved);
	expect(await remaining(first, firstWorkflow)).toEqual(allPresent);
	expect(
		await context.db.kysely
			.selectFrom(table)
			.select(["_collection_key", "_document_id"])
			.where("document_id", "=", owner)
			.execute(),
	).toEqual([{ _collection_key: collectionKey, _document_id: first }]);
	const next = await create(otherKey);
	const workflow = await dependants(next, otherKey);
	await saveRelated(owner, [
		{ id: first, collectionKey },
		{ id: next, collectionKey: otherKey },
	]);
	changes.length = 0;
	const removedCollection = await getJobDefinitionRuntime(
		deleteCollectionJob,
	).execute(
		context,
		{ collectionKey: otherKey },
		{
			jobId: randomUUID(),
			attempt: 1,
			maxAttempts: 1,
			trigger: { type: "enqueue" },
			signal: new AbortController().signal,
		},
	);
	expect(removedCollection).toEqual({ type: "success" });
	expect(
		changes.filter((change) => change.type === "referencesUpdated"),
	).toEqual([{ collectionKey, ids: [owner], type: "referencesUpdated" }]);
	expect(await remaining(next, workflow, otherKey)).toEqual(allRemoved);
	expect(
		await context.db.kysely
			.selectFrom(table)
			.select(["_collection_key", "_document_id"])
			.where("document_id", "=", owner)
			.execute(),
	).toEqual([{ _collection_key: collectionKey, _document_id: first }]);
});

test("creates one identity and retains it through updates, soft deletion and restoration", async () => {
	const id = await create();
	const workflowId = await dependants(id);
	const owner = await create("identity_revisions");
	await saveRelated(owner, [{ id, collectionKey }], "identity_revisions");
	const table = await relationTable("identity_revisions");
	expect(
		(
			await upsertSingle(context, {
				collectionKey,
				documentId: id,
				userId: null,
				fields: [{ key: "title", type: "text", value: "Updated" }],
			})
		).error,
	).toBeUndefined();
	expect(await remaining(id, workflowId)).toEqual(allPresent);
	expect(
		(await deleteSingle(context, { collectionKey, id, userId: null })).error,
	).toBeUndefined();
	expect(await remaining(id, workflowId)).toEqual({
		...allPresent,
		previews: 0,
	});
	expect(
		await context.db.kysely
			.selectFrom(table)
			.select("_document_id")
			.where("document_id", "=", owner)
			.execute(),
	).toEqual([]);
	expect(
		(await restoreMultiple(context, { collectionKey, ids: [id] })).error,
	).toBeUndefined();
	expect(await identity(id)).toEqual([
		{ collection_key: collectionKey, document_id: id },
	]);
});

test.each([
	"single",
	"multiple",
] as const)("%s permanent deletion cascades dependants and retains publish history", async (mode) => {
	const ids = [await create(), await create()];
	const first = ids[0];
	assert(first);
	const workflows = await Promise.all(ids.map((id) => dependants(id)));
	const retained = await create();
	const retainedWorkflow = await dependants(retained);
	const ownerKey = "identity_revisions";
	const owner = await create(ownerKey);
	await saveRelated(
		owner,
		[
			{ id: first, collectionKey },
			{ id: retained, collectionKey },
		],
		ownerKey,
	);
	await saveRelated(
		owner,
		[
			{ id: first, collectionKey },
			{ id: retained, collectionKey },
		],
		ownerKey,
	);
	const table = await relationTable(ownerKey);
	changes.length = 0;
	const operation = await context.db.kysely
		.insertInto("lucid_document_publish_operations")
		.values({
			collection_key: collectionKey,
			document_id: first,
			target: "production",
			operation_type: "direct",
			status: "approved",
			execution_status: "executed",
			source_version_id: 1,
			source_content_id: "snapshot",
			snapshot_version_id: 1,
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	const deleted =
		mode === "single"
			? await deleteSinglePermanently(context, {
					collectionKey,
					id: first,
					userId: null,
				})
			: await deleteMultiplePermanently(context, {
					collectionKey,
					ids,
					userId: null,
				});
	expect(deleted.error).toBeUndefined();
	const rows = await context.db.kysely
		.selectFrom(table)
		.select(["_document_id", "document_version_id"])
		.where("document_id", "=", owner)
		.execute();
	expect(rows.length).toBeGreaterThan(1);
	expect(rows.every((row) => row._document_id === retained)).toBe(true);
	expect(
		changes.filter(
			(change) =>
				change.collectionKey === ownerKey &&
				change.type === "referencesUpdated",
		),
	).toEqual([
		{ collectionKey: ownerKey, ids: [owner], type: "referencesUpdated" },
	]);
	expect(
		await context.db.kysely
			.selectFrom("lucid_document_references")
			.select("target_id")
			.where("collection_key", "=", ownerKey)
			.where("document_id", "=", owner)
			.where("target_id", "=", first)
			.execute(),
	).toEqual([]);
	for (const [index, id] of ids.entries()) {
		const workflowId = workflows[index];
		assert(workflowId);
		expect(await remaining(id, workflowId)).toEqual(
			mode === "single" && index === 1 ? allPresent : allRemoved,
		);
	}
	expect(await remaining(retained, retainedWorkflow)).toEqual(allPresent);
	expect(
		await context.db.kysely
			.selectFrom("lucid_document_publish_operations")
			.select("id")
			.where("id", "=", operation.id)
			.execute(),
	).toEqual([{ id: operation.id }]);
	await expect(
		context.db.kysely
			.insertInto("lucid_document_workflows")
			.values({
				collection_key: collectionKey,
				document_id: first,
				stage_key: "draft",
			})
			.execute(),
	).rejects.toThrow(/FOREIGN KEY/);
	await expect(
		context.db.kysely
			.insertInto("lucid_preview_sessions")
			.values({
				token_hash: randomUUID(),
				entry_collection_key: collectionKey,
				entry_document_id: first,
				entry_version_type: "latest",
				mode: "perspective",
				expires_at: "2099-01-01T00:00:00.000Z",
			})
			.execute(),
	).rejects.toThrow(/FOREIGN KEY/);
	await expect(
		context.db.kysely
			.insertInto("lucid_agent_document_references")
			.values({
				id: randomUUID(),
				conversation_id: conversationId,
				collection_key: collectionKey,
				document_id: first,
				source: "message",
				created_at: new Date().toISOString(),
			})
			.execute(),
	).rejects.toThrow(/FOREIGN KEY/);
});

test.each([
	true,
	false,
])("failed document creation leaves no identity or workflow, transactions: %s", async (transactions) => {
	if (!transactions) {
		const supports = context.config.db.supports.bind(context.config.db);
		vi.spyOn(context.config.db, "supports").mockImplementation((feature) =>
			feature === "transaction" ? false : supports(feature),
		);
	}
	const before = await context.db.kysely
		.selectFrom("lucid_document_identities")
		.selectAll()
		.execute();
	const workflows = await context.db.kysely
		.selectFrom("lucid_document_workflows")
		.selectAll()
		.execute();
	const tables = await getTableNames(context, collectionKey);
	assert(tables.data);
	const documents = await context.db.kysely
		.selectFrom(tables.data.document)
		.select("id")
		.execute();
	const failed = await upsertSingle(context, {
		collectionKey,
		userId: null,
		fields: [],
	});
	expect(failed.error).toBeDefined();
	expect(
		await context.db.kysely
			.selectFrom("lucid_document_identities")
			.selectAll()
			.execute(),
	).toEqual(before);
	expect(
		await context.db.kysely
			.selectFrom("lucid_document_workflows")
			.selectAll()
			.execute(),
	).toEqual(workflows);
	expect(
		await context.db.kysely
			.selectFrom(tables.data.document)
			.select("id")
			.execute(),
	).toEqual(documents);
});

test("a failed deletion rolls back the identity and every cascade", async () => {
	const id = await create();
	const workflowId = await dependants(id);
	const hooks = context.config.hooks;
	context.config.hooks = [
		...hooks,
		{
			service: "documents",
			event: "afterDelete",
			handler: async () => ({
				data: undefined,
				error: {
					type: "basic",
					status: 400,
					message: copy("server:tests.keep.document", {
						defaultMessage: "Keep this document",
					}),
				},
			}),
		},
	];
	try {
		expect(
			(
				await deleteSinglePermanently(context, {
					collectionKey,
					id,
					userId: null,
				})
			).error,
		).toBeDefined();
		expect(await remaining(id, workflowId)).toEqual(allPresent);
	} finally {
		context.config.hooks = hooks;
	}
});

const latestVersion = async (documentId: number, key = collectionKey) => {
	const tables = await getTableNames(context, key);
	assert(tables.data);
	return context.db.kysely
		.selectFrom(tables.data.version)
		.select("id")
		.where("document_id", "=", documentId)
		.where("type", "=", "latest")
		.executeTakeFirstOrThrow();
};

const pinVersion = async (
	documentId: number,
	versionId: number,
	key = collectionKey,
	ctx = context,
) => {
	await ctx.db.kysely
		.insertInto("lucid_agent_document_references")
		.values({
			id: randomUUID(),
			conversation_id: conversationId,
			collection_key: key,
			document_id: documentId,
			version_id: versionId,
			source: "message",
			created_at: new Date().toISOString(),
		})
		.execute();
	await ctx.db.kysely
		.insertInto("lucid_preview_sessions")
		.values({
			token_hash: randomUUID(),
			entry_collection_key: key,
			entry_document_id: documentId,
			entry_version_id: versionId,
			entry_version_type: "revision",
			mode: "scoped",
			expires_at: "2099-01-01T00:00:00.000Z",
		})
		.execute();
	await ctx.db.kysely
		.insertInto("lucid_document_references")
		.values({
			generation: randomUUID(),
			collection_key: key,
			document_id: documentId,
			version_id: versionId,
			source_table: "test",
			source_column: "body",
			locale: "",
			kind: "embedded",
			target_resource: "media",
			target_table: "lucid_media",
			target_id: 999,
		})
		.execute();
};
const versionDependants = async (versionId: number, key = collectionKey) => {
	const db = context.db.kysely;
	return {
		identity: (
			await db
				.selectFrom("lucid_document_version_identities")
				.selectAll()
				.where("collection_key", "=", key)
				.where("version_id", "=", versionId)
				.execute()
		).length,
		agent: (
			await db
				.selectFrom("lucid_agent_document_references")
				.select("id")
				.where("collection_key", "=", key)
				.where("version_id", "=", versionId)
				.execute()
		).length,
		preview: (
			await db
				.selectFrom("lucid_preview_sessions")
				.select("id")
				.where("entry_collection_key", "=", key)
				.where("entry_version_id", "=", versionId)
				.execute()
		).length,
		index: (
			await db
				.selectFrom("lucid_document_references")
				.select("version_id")
				.where("collection_key", "=", key)
				.where("version_id", "=", versionId)
				.execute()
		).length,
	};
};
const versionPresent = { identity: 1, agent: 1, preview: 1, index: 1 };
const versionRemoved = { identity: 0, agent: 0, preview: 0, index: 0 };

test("replacing latest cascades version dependants and preserves unpinned links", async () => {
	const documentId = await create();
	const version = await latestVersion(documentId);
	await pinVersion(documentId, version.id);
	expect(
		(
			await registerReferences(context, {
				conversationId,
				references: [{ type: "document", collectionKey, documentId }],
				source: { type: "message" },
			})
		).error,
	).toBeUndefined();
	expect(
		(
			await upsertSingle(context, {
				collectionKey,
				documentId,
				userId: null,
				fields: [{ key: "title", type: "text", value: "Replacement" }],
			})
		).error,
	).toBeUndefined();
	expect(await versionDependants(version.id)).toEqual(versionRemoved);
	const latest = await latestVersion(documentId);
	expect((await versionDependants(latest.id)).identity).toBe(1);
	expect(
		await context.db.kysely
			.selectFrom("lucid_agent_document_references")
			.select("version_id")
			.where("collection_key", "=", collectionKey)
			.where("document_id", "=", documentId)
			.execute(),
	).toEqual([{ version_id: null }]);
});

test("retaining a revision keeps its identity, and batch document deletion cascades owned indexes", async () => {
	const key = "identity_revisions";
	const documentId = await create(key);
	const version = await latestVersion(documentId, key);
	await pinVersion(documentId, version.id, key);
	expect(
		(
			await upsertSingle(context, {
				collectionKey: key,
				documentId,
				userId: null,
				fields: [{ key: "title", type: "text", value: "New latest" }],
			})
		).error,
	).toBeUndefined();
	expect(await versionDependants(version.id, key)).toEqual(versionPresent);
	const latest = await latestVersion(documentId, key);
	await pinVersion(documentId, latest.id, key);
	expect(
		(
			await deleteMultiplePermanently(context, {
				collectionKey: key,
				ids: [documentId],
				userId: null,
			})
		).error,
	).toBeUndefined();
	expect(await versionDependants(version.id, key)).toEqual(versionRemoved);
	expect(await versionDependants(latest.id, key)).toEqual(versionRemoved);
});

test("snapshot cloning and promotion create identities and remove replaced version links", async () => {
	const documentId = await create();
	const previous = await latestVersion(documentId);
	await pinVersion(documentId, previous.id);
	const snapshot = await cloneVersion(context, {
		collectionKey,
		documentId,
		fromVersionId: previous.id,
		toVersionType: constants.collectionBuilder.publishing.snapshotVersionType,
		userId: null,
	});
	assert(snapshot.data, JSON.stringify(snapshot.error));
	await pinVersion(documentId, snapshot.data.versionId);
	expect(await versionDependants(snapshot.data.versionId)).toEqual(
		versionPresent,
	);
	expect(
		(
			await promoteVersion(context, {
				collectionKey,
				documentId,
				fromVersionId: snapshot.data.versionId,
				toVersionType: "latest",
				userId: null,
				createRevision: false,
			})
		).error,
	).toBeUndefined();
	expect(await versionDependants(previous.id)).toEqual(versionRemoved);
	expect(await versionDependants(snapshot.data.versionId)).toEqual(
		versionPresent,
	);
	const promoted = await latestVersion(documentId);
	expect((await versionDependants(promoted.id)).identity).toBe(1);
});

test.each([
	true,
	false,
])("failed version saves remove new identities and preserve the previous version, transactions: %s", async (transactions) => {
	if (!transactions) {
		const supports = context.config.db.supports.bind(context.config.db);
		vi.spyOn(context.config.db, "supports").mockImplementation((feature) =>
			feature === "transaction" ? false : supports(feature),
		);
	}
	const documentId = await create();
	const previous = await latestVersion(documentId);
	await pinVersion(documentId, previous.id);
	let failedVersionId: number | undefined;
	const hooks = context.config.hooks;
	context.config.hooks = [
		...hooks,
		{
			service: "documents",
			event: "afterUpsert",
			handler: async ({ context: ctx, data }) => {
				failedVersionId = data.versionId;
				await pinVersion(documentId, data.versionId, collectionKey, ctx);
				return {
					data: undefined,
					error: {
						type: "basic",
						status: 400,
						message: copy("server:tests.reject.version", {
							defaultMessage: "Reject version",
						}),
					},
				};
			},
		},
	];
	try {
		expect(
			(
				await upsertSingle(context, {
					collectionKey,
					documentId,
					userId: null,
					fields: [{ key: "title", type: "text", value: "Rejected" }],
				})
			).error,
		).toBeDefined();
		assert(failedVersionId);
		expect(await versionDependants(failedVersionId)).toEqual(versionRemoved);
		expect(await versionDependants(previous.id)).toEqual(versionPresent);
		expect((await latestVersion(documentId)).id).toBe(previous.id);
	} finally {
		context.config.hooks = hooks;
	}
});

test("pinned foreign keys reject a version belonging to another document", async () => {
	const first = await create();
	const other = await create();
	const version = await latestVersion(first);
	await expect(
		context.db.kysely
			.insertInto("lucid_agent_document_references")
			.values({
				id: randomUUID(),
				conversation_id: conversationId,
				collection_key: collectionKey,
				document_id: other,
				version_id: version.id,
				source: "message",
				created_at: new Date().toISOString(),
			})
			.execute(),
	).rejects.toThrow(/FOREIGN KEY/);
	await expect(
		context.db.kysely
			.insertInto("lucid_preview_sessions")
			.values({
				token_hash: randomUUID(),
				entry_collection_key: collectionKey,
				entry_document_id: other,
				entry_version_id: version.id,
				entry_version_type: "revision",
				mode: "scoped",
				expires_at: "2099-01-01T00:00:00.000Z",
			})
			.execute(),
	).rejects.toThrow(/FOREIGN KEY/);
});

test("a failed identity cleanup preserves replacement content and can be retried without the physical version", async () => {
	const documentId = await create();
	const previous = await latestVersion(documentId);
	await pinVersion(documentId, previous.id);
	const tables = await getTableNames(context, collectionKey);
	assert(tables.data);
	const supports = context.config.db.supports.bind(context.config.db);
	vi.spyOn(context.config.db, "supports").mockImplementation((feature) =>
		feature === "transaction" ? false : supports(feature),
	);
	await sql`CREATE TRIGGER fail_old_identity_delete BEFORE DELETE ON lucid_document_version_identities
		WHEN OLD.collection_key = ${sql.lit(collectionKey)} AND OLD.version_id = ${sql.lit(previous.id)}
		BEGIN SELECT RAISE(ABORT, 'Identity cleanup failed'); END`.execute(
		context.db.kysely,
	);
	try {
		const saved = await upsertSingle(context, {
			collectionKey,
			documentId,
			userId: null,
			fields: [{ key: "title", type: "text", value: "Replacement" }],
		});
		expect(saved.error).toBeDefined();
		const replacement = await latestVersion(documentId);
		expect(replacement.id).not.toBe(previous.id);
		expect(
			await context.db.kysely
				.selectFrom(tables.data.documentFields)
				.select("_title")
				.where("document_version_id", "=", replacement.id)
				.execute(),
		).toEqual([{ _title: "Replacement" }]);
		expect(await versionDependants(previous.id)).toEqual(versionPresent);
	} finally {
		await sql`DROP TRIGGER fail_old_identity_delete`.execute(context.db.kysely);
	}

	const DocumentVersions = new DocumentVersionsRepository(context.db);
	const retried = await DocumentVersions.deleteVersions(
		{
			collectionKey,
			where: [{ key: "id", operator: "=", value: previous.id }],
			documentId,
		},
		{ tableName: tables.data.version },
	);
	expect(retried.error).toBeUndefined();
	expect(await versionDependants(previous.id)).toEqual(versionRemoved);
	expect((await latestVersion(documentId)).id).not.toBe(previous.id);
});

test("revision cleanup retries orphan identities when no physical candidates remain", async () => {
	const key = "identity_revisions";
	const documentId = await create(key);
	const previous = await latestVersion(documentId, key);
	await pinVersion(documentId, previous.id, key);
	await saveRelated(documentId, [], key);
	const current = await latestVersion(documentId, key);
	const tables = await getTableNames(context, key);
	assert(tables.data);
	await context.db.kysely
		.updateTable(tables.data.version)
		.set({ created_at: "2000-01-01T00:00:00.000Z" })
		.where("id", "=", previous.id)
		.execute();
	const versions = new DocumentVersionsRepository(context.db);
	const supports = context.config.db.supports.bind(context.config.db);
	vi.spyOn(context.config.db, "supports").mockImplementation((feature) =>
		feature === "transaction" ? false : supports(feature),
	);
	await sql`CREATE TRIGGER fail_revision_identity_delete BEFORE DELETE ON lucid_document_version_identities
        WHEN OLD.collection_key = ${sql.lit(key)} AND OLD.version_id = ${sql.lit(previous.id)}
        BEGIN SELECT RAISE(ABORT, 'identity cleanup failed'); END`.execute(
		context.db.kysely,
	);
	try {
		const failed = await versions.deleteExpiredRevisions(
			{
				collectionKey: key,
				cutoffDate: "2020-01-01T00:00:00.000Z",
				documentIds: [documentId],
			},
			{ tableName: tables.data.version },
		);
		expect(failed.error).toBeDefined();
		expect(
			await context.db.kysely
				.selectFrom(tables.data.version)
				.select("id")
				.where("id", "=", previous.id)
				.execute(),
		).toEqual([]);
		expect(await versionDependants(previous.id, key)).toEqual(versionPresent);
	} finally {
		await sql`DROP TRIGGER fail_revision_identity_delete`.execute(
			context.db.kysely,
		);
	}
	const retried = await getJobDefinitionRuntime(
		deleteExpiredRevisionsJob,
	).execute(
		context,
		{ collectionKey: key, retentionDays: 30 },
		{
			jobId: randomUUID(),
			attempt: 2,
			maxAttempts: 2,
			trigger: { type: "enqueue" },
			signal: new AbortController().signal,
		},
	);
	expect(retried).toEqual({ type: "success" });
	expect(await versionDependants(previous.id, key)).toEqual(versionRemoved);
	expect((await latestVersion(documentId, key)).id).toBe(current.id);
	expect((await versionDependants(current.id, key)).identity).toBe(1);
});
