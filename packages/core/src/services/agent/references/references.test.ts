import { randomUUID } from "node:crypto";
import { afterAll, assert, beforeAll, expect, test } from "vitest";
import defineAgent from "../../../libs/agent/define-agent.js";
import runnerTools from "../../../libs/agent/runner-tools.js";
import applyCollectionMigrations from "../../../libs/collection/apply-collection-migrations.js";
import CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import getCurrentCollectionMigrationId from "../../../libs/collection/migration/get-current-collection-migration-id.js";
import planCollectionMigrations from "../../../libs/collection/plan-collection-migrations.js";
import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { copy, createTranslationStore } from "../../../libs/i18n/index.js";
import { getJobDefinitionRuntime } from "../../../libs/jobs/registry.js";
import { getAgentPermission } from "../../../libs/permission/agent-permissions.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import {
	AgentDocumentReferencesRepository,
	AgentMediaReferencesRepository,
	DocumentsRepository,
	DocumentVersionsRepository,
	MediaRepository,
	UserRolesRepository,
	UsersRepository,
} from "../../../libs/repositories/index.js";
import { agentReferenceSchema } from "../../../schemas/agent-references.js";
import type {
	AgentReferenceInput,
	AgentRunnerToolName,
} from "../../../types/response.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import withTransaction from "../../../utils/services/with-transaction.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import deleteMultiplePermanently from "../../documents/delete-multiple-permanently.js";
import deleteSinglePermanently from "../../documents/delete-single-permanently.js";
import acquireDocumentWrites from "../../documents/helpers/acquire-document-writes.js";
import createDocumentBricks from "../../documents-bricks/create-multiple.js";
import { deleteExpiredRevisionsJob } from "../../documents-versions/jobs/delete-expired-revisions.js";
import createRole from "../../roles/create-single.js";
import syncCollections from "../../sync/sync-collections.js";
import deleteReference from "../delete-reference.js";
import getReferences from "../get-references.js";
import insertConversation from "../helpers/insert-conversation.js";
import resolveRunSetup from "../helpers/resolve-run-setup.js";
import { runnerToolHandlers } from "../helpers/runner-tools/index.js";
import list from "./list.js";
import register from "./register.js";

const fixture = getTestConfig();
const collection = new CollectionBuilder("agent_reference_test", {
	mode: "multiple",
	details: {
		labels: {
			singular: copy("admin:tests.reference.page", { defaultMessage: "Page" }),
			plural: "Pages",
		},
	},
}).addText("title", { useAsLabel: true });
const agent = defineAgent({
	key: "references",
	name: "References",
	description: "Tests linked resources.",
	attachments: { media: false, documents: false },
});
let context: ServiceContext;

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: {
			...config,
			collections: [collection],
			ai: { ...config.ai, agents: { definitions: [agent] } },
		},
		database: await fixture.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {
				en: { admin: { "tests.reference.page": "Article" }, server: {} },
			},
		}),
	});
	await fixture.migrate();
	expect((await syncCollections(context)).error).toBeUndefined();
	const plan = await planCollectionMigrations(context);
	assert(plan.data, JSON.stringify(plan.error));
	expect(
		(await applyCollectionMigrations(context, plan.data)).error,
	).toBeUndefined();
});
afterAll(() => fixture.destroy());

const createChat = async (userId: number | null = null) => {
	const result = await insertConversation(context, {
		agentKey: agent.key,
		userId,
	});
	assert(result.data, JSON.stringify(result.error));
	return result.data.id;
};
const createMedia = async () => {
	const result = await new MediaRepository(context.db).createSingle({
		data: {
			key: randomUUID(),
			storage_adapter_key: "test",
			origin: "human",
			type: "image",
			mime_type: "image/png",
			file_extension: "png",
			file_size: 1,
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	assert(result.data, JSON.stringify(result.error));
	return result.data.id;
};
const createDocument = async () => {
	const names = await getTableNames(context, collection.key);
	assert(names.data, JSON.stringify(names.error));
	const migration = await getCurrentCollectionMigrationId(
		context,
		collection.key,
	);
	assert(migration.data, JSON.stringify(migration.error));
	const document = await new DocumentsRepository(context.db).createSingle(
		{
			data: {
				collection_key: collection.key,
				collection_migration_id: migration.data,
			},
			returning: ["id"],
			validation: { enabled: true },
		},
		{ tableName: names.data.document },
	);
	assert(document.data, JSON.stringify(document.error));
	const versions: number[] = [];
	for (const type of ["latest", "revision"]) {
		const version = await new DocumentVersionsRepository(
			context.db,
		).createSingle(
			{
				data: {
					collection_key: collection.key,
					collection_migration_id: migration.data,
					document_id: document.data.id,
					type,
					content_id: randomUUID(),
					created_at:
						type === "revision"
							? "2000-01-01T00:00:00.000Z"
							: new Date().toISOString(),
				},
				returning: ["id"],
				validation: { enabled: true },
			},
			{ tableName: names.data.version },
		);
		assert(version.data, JSON.stringify(version.error));
		versions.push(version.data.id);
	}
	const [latestId, revisionId] = versions;
	assert(latestId && revisionId);
	return { id: document.data.id, latestId, revisionId, tables: names.data };
};
const documentLinks = async (conversationId: string) => {
	const result = await new AgentDocumentReferencesRepository(
		context.db,
	).selectMultiple({
		select: ["document_id", "version_id"],
		where: [{ key: "conversation_id", operator: "=", value: conversationId }],
	});
	assert(result.data, JSON.stringify(result.error));
	return result.data;
};
const mediaLinks = async (conversationId: string) => {
	const result = await new AgentMediaReferencesRepository(
		context.db,
	).selectMultiple({
		select: ["media_id"],
		where: [{ key: "conversation_id", operator: "=", value: conversationId }],
	});
	assert(result.data, JSON.stringify(result.error));
	return result.data;
};
const documentReferences = (
	document: Awaited<ReturnType<typeof createDocument>>,
): AgentReferenceInput[] => [
	{ type: "document", collectionKey: collection.key, documentId: document.id },
	{
		type: "document",
		collectionKey: collection.key,
		documentId: document.id,
		versionId: document.latestId,
	},
	{
		type: "document",
		collectionKey: collection.key,
		documentId: document.id,
		versionId: document.revisionId,
	},
];

const link = (
	conversationId: string,
	references: AgentReferenceInput[],
	options?: { skipMissing?: boolean },
) =>
	register(context, {
		conversationId,
		references,
		source: { type: "message" },
		...options,
	});

test("user attachments take precedence over repeated tool registrations for media and pinned or unpinned documents", async () => {
	const conversationId = await createChat();
	const document = await createDocument();
	const mediaId = await createMedia();
	const references: AgentReferenceInput[] = [
		{ type: "media", mediaId },
		...documentReferences(document),
	];
	for (let attempt = 0; attempt < 2; attempt++) {
		const linked = await register(context, {
			conversationId,
			references,
			source: { type: "tool", toolName: "save_note" },
		});
		expect(linked.error).toBeUndefined();
		expect(linked.data).toContainEqual({
			type: "media",
			mediaId,
			label: expect.any(String),
			mimeType: "image/png",
		});
	}
	expect((await link(conversationId, references)).error).toBeUndefined();

	const Media = new AgentMediaReferencesRepository(context.db);
	const sources = await Media.selectMultiple({
		select: ["source", "tool_name"],
		where: [{ key: "conversation_id", operator: "=", value: conversationId }],
	});
	expect(sources.data).toEqual([{ source: "message", tool_name: null }]);
	expect(
		(
			await register(context, {
				conversationId,
				references,
				source: { type: "tool", toolName: "save_note" },
			})
		).error,
	).toBeUndefined();
	const links = await list(context, { conversationId, userId: null });
	expect(links.data).toHaveLength(4);
	expect(
		links.data?.every((reference) => reference.source.type === "message"),
	).toBe(true);
	expect(await documentLinks(conversationId)).toHaveLength(3);
	expect(await documentLinks(conversationId)).toEqual(
		expect.arrayContaining([
			{ document_id: document.id, version_id: null },
			{ document_id: document.id, version_id: document.latestId },
			{ document_id: document.id, version_id: document.revisionId },
		]),
	);
});

test("rejects another document's version without partially registering the batch", async () => {
	const conversationId = await createChat();
	const document = await createDocument();
	const other = await createDocument();
	const mediaId = await createMedia();
	const result = await link(conversationId, [
		{ type: "media", mediaId },
		{
			type: "document",
			collectionKey: collection.key,
			documentId: document.id,
			versionId: other.latestId,
		},
	]);
	expect(result.error?.status).toBe(404);
	expect(await mediaLinks(conversationId)).toEqual([]);
	expect(await documentLinks(conversationId)).toEqual([]);
});

test("media hard deletion cascades through references in every chat", async () => {
	const first = await createChat();
	const second = await createChat();
	const mediaId = await createMedia();
	const retainedId = await createMedia();
	for (const conversationId of [first, second]) {
		expect(
			(
				await link(conversationId, [
					{ type: "media", mediaId },
					{ type: "media", mediaId: retainedId },
				])
			).error,
		).toBeUndefined();
	}
	expect(
		(
			await new MediaRepository(context.db).deleteSingle({
				where: [{ key: "id", operator: "=", value: mediaId }],
			})
		).error,
	).toBeUndefined();
	for (const conversationId of [first, second])
		expect(await mediaLinks(conversationId)).toEqual([
			{ media_id: retainedId },
		]);
});

test.each([
	"single",
	"multiple",
] as const)("%s document hard deletion removes pinned and unpinned links only for its targets", async (mode) => {
	const conversationId = await createChat();
	const first = await createDocument();
	const second = await createDocument();
	const retained = await createDocument();
	expect(
		(
			await link(
				conversationId,
				[first, second, retained].flatMap(documentReferences),
			)
		).error,
	).toBeUndefined();
	const result =
		mode === "single"
			? await deleteSinglePermanently(context, {
					id: first.id,
					collectionKey: collection.key,
					userId: null,
				})
			: await deleteMultiplePermanently(context, {
					ids: [first.id, second.id],
					collectionKey: collection.key,
					userId: null,
				});
	expect(result.error).toBeUndefined();
	const remaining = await documentLinks(conversationId);
	expect(remaining).toHaveLength(mode === "single" ? 6 : 3);
	expect(
		remaining.every(
			(link) =>
				link.document_id !== first.id &&
				(mode === "single" || link.document_id !== second.id),
		),
	).toBe(true);
});

test("revision retention removes expired pinned links while preserving live and unpinned references", async () => {
	const conversationId = await createChat();
	const document = await createDocument();
	expect(
		(await link(conversationId, documentReferences(document))).error,
	).toBeUndefined();
	const result = await getJobDefinitionRuntime(
		deleteExpiredRevisionsJob,
	).execute(
		context,
		{ collectionKey: collection.key, retentionDays: 30 },
		{
			jobId: randomUUID(),
			attempt: 1,
			maxAttempts: 1,
			trigger: { type: "enqueue" },
			signal: new AbortController().signal,
		},
	);
	expect(result).toEqual({ type: "success" });
	expect(await documentLinks(conversationId)).toEqual(
		expect.arrayContaining([
			{ document_id: document.id, version_id: null },
			{ document_id: document.id, version_id: document.latestId },
		]),
	);
	expect(await documentLinks(conversationId)).toHaveLength(2);
});

test("delivery skips deleted resources while ordinary registration stays strict", async () => {
	const conversationId = await createChat();
	const mediaId = await createMedia();
	const missingId = await createMedia();
	expect(
		(
			await new MediaRepository(context.db).deleteSingle({
				where: [{ key: "id", operator: "=", value: missingId }],
			})
		).error,
	).toBeUndefined();
	const references: AgentReferenceInput[] = [
		{ type: "media", mediaId },
		{ type: "media", mediaId: missingId },
	];
	expect((await link(conversationId, references)).error?.status).toBe(404);
	expect(await mediaLinks(conversationId)).toEqual([]);
	const delivered = await link(conversationId, references, {
		skipMissing: true,
	});
	expect(delivered.error).toBeUndefined();
	expect(delivered.data).toHaveLength(1);
	expect(await mediaLinks(conversationId)).toEqual([{ media_id: mediaId }]);
});

test("linking is not blocked while a document is being edited, but revision cleanup waits", async () => {
	const conversationId = await createChat();
	const document = await createDocument();
	const references = documentReferences(document);
	const guarded = await withTransaction(context, async (context) => {
		const acquired = await acquireDocumentWrites(context, {
			collectionKey: collection.key,
			ids: [document.id],
		});
		assert(acquired.data, JSON.stringify(acquired.error));
		await using _claims = acquired.data;
		expect(
			(
				await register(context, {
					conversationId,
					references,
					source: { type: "message" },
				})
			).error,
		).toBeUndefined();
		const expired = await getJobDefinitionRuntime(
			deleteExpiredRevisionsJob,
		).execute(
			context,
			{ collectionKey: collection.key, retentionDays: 30 },
			{
				jobId: randomUUID(),
				attempt: 1,
				maxAttempts: 1,
				trigger: { type: "enqueue" },
				signal: new AbortController().signal,
			},
		);
		expect(expired).toMatchObject({ type: "failed", error: { status: 409 } });
		return { error: undefined, data: undefined };
	});
	expect(guarded.error).toBeUndefined();
	expect(await documentLinks(conversationId)).toHaveLength(3);
});

test("delivery skips deleted documents while retaining surviving references", async () => {
	const conversationId = await createChat();
	const deleted = await createDocument();
	const retained = await createDocument();
	expect(
		(
			await deleteSinglePermanently(context, {
				id: deleted.id,
				collectionKey: collection.key,
				userId: null,
			})
		).error,
	).toBeUndefined();
	const references = [
		...documentReferences(deleted),
		...documentReferences(retained),
	];
	expect((await link(conversationId, references)).error?.status).toBe(404);
	expect(
		(await link(conversationId, references, { skipMissing: true })).error,
	).toBeUndefined();
	expect(await documentLinks(conversationId)).toHaveLength(3);
	expect(
		(await documentLinks(conversationId)).every(
			(link) => link.document_id === retained.id,
		),
	).toBe(true);
});

const createReader = async (permissions?: string[]) => {
	const user = await new UsersRepository(context.db).createSingle({
		data: {
			email: `${randomUUID()}@example.test`,
			username: randomUUID(),
			secret: "test",
			super_admin: permissions === undefined,
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	assert(user.data, JSON.stringify(user.error));
	if (permissions) {
		const role = await createRole(context, { name: randomUUID(), permissions });
		assert(role.data, JSON.stringify(role.error));
		expect(
			(
				await new UserRolesRepository(context.db).createSingle({
					data: { user_id: user.data.id, role_id: role.data },
				})
			).error,
		).toBeUndefined();
	}
	return user.data.id;
};

test("fetches current labels and media details while preserving pinned document versions", async () => {
	const userId = await createReader();
	const conversationId = await createChat(userId);
	const mediaId = await createMedia();
	const document = await createDocument();
	const untitled = await createDocument();
	for (const [versionId, title] of [
		[document.latestId, "Current title"],
		[document.revisionId, "Earlier title"],
	] as const) {
		expect(
			(
				await createDocumentBricks(context, {
					collection,
					documentId: document.id,
					versionId,
					fields: [{ key: "title", type: "text", value: title }],
				})
			).error,
		).toBeUndefined();
	}
	expect(
		(
			await new MediaRepository(context.db).updateSingle({
				where: [{ key: "id", operator: "=", value: mediaId }],
				data: { file_name: "Campaign.png" },
			})
		).error,
	).toBeUndefined();
	expect(
		(
			await link(conversationId, [
				{ type: "media", mediaId },
				{
					type: "document",
					collectionKey: collection.key,
					documentId: document.id,
				},
				{
					type: "document",
					collectionKey: collection.key,
					documentId: document.id,
					versionId: document.revisionId,
				},
				{
					type: "document",
					collectionKey: collection.key,
					documentId: untitled.id,
				},
			])
		).error,
	).toBeUndefined();
	const result = await getReferences(context, { id: conversationId, userId });
	expect(result.error).toBeUndefined();
	expect(result.data).toEqual(
		expect.arrayContaining([
			expect.objectContaining({
				type: "media",
				mediaId,
				label: "Campaign.png",
				mimeType: "image/png",
				previewUrl: expect.any(String),
				source: { type: "message" },
			}),
			expect.objectContaining({
				type: "document",
				documentId: document.id,
				label: "Current title",
				version: "latest",
			}),
			expect.objectContaining({
				type: "document",
				documentId: document.id,
				versionId: document.revisionId,
				label: "Earlier title",
				version: "revision",
			}),
			expect.objectContaining({
				type: "document",
				documentId: untitled.id,
				label: `Article #${untitled.id}`,
			}),
		]),
	);
	for (const reference of result.data ?? []) {
		expect(reference).not.toHaveProperty("fields");
		expect(agentReferenceSchema.parse(reference)).toEqual(reference);
	}
	expect(
		(
			await new MediaRepository(context.db).updateSingle({
				where: [{ key: "id", operator: "=", value: mediaId }],
				data: { file_name: "Updated.png" },
			})
		).error,
	).toBeUndefined();
	expect(
		(await getReferences(context, { id: conversationId, userId })).data,
	).toContainEqual(
		expect.objectContaining({ type: "media", label: "Updated.png" }),
	);
});

test("another user cannot fetch references from a privately owned chat", async () => {
	const ownerId = await createReader();
	const otherId = await createReader();
	const conversationId = await createChat(ownerId);
	const mediaId = await createMedia();
	expect(
		(await link(conversationId, [{ type: "media", mediaId }])).error,
	).toBeUndefined();
	expect(
		(await getReferences(context, { id: conversationId, userId: otherId }))
			.error?.status,
	).toBe(404);
});

test("filters hydrated references by the viewer's resource permissions", async () => {
	const mediaId = await createMedia();
	const document = await createDocument();
	for (const mediaAccess of [false, true]) {
		const userId = await createReader([
			getAgentPermission(agent.key, "use"),
			...(mediaAccess ? [Permissions.MediaRead] : []),
		]);
		const conversationId = await createChat(userId);
		expect(
			(
				await link(conversationId, [
					{ type: "media", mediaId },
					...documentReferences(document),
				])
			).error,
		).toBeUndefined();
		const result = await getReferences(context, { id: conversationId, userId });
		expect(result.error).toBeUndefined();
		expect(result.data?.map((reference) => reference.type)).toEqual(
			mediaAccess ? ["media"] : [],
		);
	}
});

test("unlinking removes one reference for the chat's owner only", async () => {
	const ownerId = await createReader();
	const otherId = await createReader();
	const conversationId = await createChat(ownerId);
	const mediaId = await createMedia();
	const document = await createDocument();
	expect(
		(
			await link(conversationId, [
				{ type: "media", mediaId },
				{
					type: "document",
					collectionKey: collection.key,
					documentId: document.id,
				},
			])
		).error,
	).toBeUndefined();
	const links = await getReferences(context, {
		id: conversationId,
		userId: ownerId,
	});
	const media = links.data?.find((reference) => reference.type === "media");
	assert(media, JSON.stringify(links));

	expect(
		(
			await deleteReference(context, {
				conversationId,
				referenceId: media.id,
				userId: otherId,
			})
		).error?.status,
	).toBe(404);
	expect(await mediaLinks(conversationId)).toHaveLength(1);

	expect(
		(
			await deleteReference(context, {
				conversationId,
				referenceId: media.id,
				userId: ownerId,
			})
		).error,
	).toBeUndefined();
	expect(await mediaLinks(conversationId)).toEqual([]);
	expect(await documentLinks(conversationId)).toHaveLength(1);
});

const callReferenceTool = async (
	conversationId: string,
	name: AgentRunnerToolName,
	input: Record<string, unknown>,
	userId: number | null = null,
) => {
	const handler = runnerToolHandlers.get(name);
	assert(handler);
	return handler(context, {
		call: { id: randomUUID(), name, input },
		run: {
			id: randomUUID(),
			conversation_id: conversationId,
			routine_id: null,
			user_id: userId,
			execution_version: 1,
			agent_key: agent.key,
			conversation_user_id: userId,
			conversation_routine_id: null,
		},
		mode: "chat",
		checkpoint: {
			version: 1,
			approvalMode: "automatic",
			messages: [],
			nudges: 0,
			requestId: randomUUID(),
			messageId: randomUUID(),
			parts: [],
			calls: [],
			cursor: 0,
			phase: "tools",
		},
		setup: resolveRunSetup(context, {
			agent,
			mode: "chat",
			hasHistory: false,
			authority: {
				principal: { type: "system" },
				superAdmin: true,
				permissions: [],
			},
		}),
	});
};

test("reference tools register, list and remove resources within their own chat", async () => {
	const conversationId = await createChat();
	const otherChat = await createChat();
	const document = await createDocument();
	const mediaId = await createMedia();
	const references: AgentReferenceInput[] = [
		{ type: "media", mediaId },
		...documentReferences(document),
	];
	for (const chat of [conversationId, otherChat]) {
		expect(
			await callReferenceTool(chat, runnerTools.registerReferences.name, {
				references,
			}),
		).toMatchObject({ failed: false });
	}
	const linked = await list(context, { conversationId, userId: null });
	assert(linked.data);
	const listed = await callReferenceTool(
		conversationId,
		runnerTools.references.name,
		{},
	);
	expect(listed).toMatchObject({
		output: {
			references: linked.data.map(({ id }) => ({
				id,
				linkedBy: runnerTools.registerReferences.name,
			})),
		},
	});
	for (const { id } of linked.data) {
		for (let attempt = 0; attempt < 2; attempt++) {
			expect(
				await callReferenceTool(
					conversationId,
					runnerTools.removeReference.name,
					{ referenceId: id },
				),
			).toMatchObject({ failed: false });
		}
	}
	expect((await list(context, { conversationId, userId: null })).data).toEqual(
		[],
	);
	const otherLinks = await list(context, {
		conversationId: otherChat,
		userId: null,
	});
	assert(otherLinks.data);
	for (const { id } of otherLinks.data) {
		await callReferenceTool(conversationId, runnerTools.removeReference.name, {
			referenceId: id,
		});
	}
	expect(
		(await list(context, { conversationId: otherChat, userId: null })).data,
	).toHaveLength(4);
	expect(
		(
			await new MediaRepository(context.db).selectSingle({
				select: ["id"],
				where: [{ key: "id", operator: "=", value: mediaId }],
			})
		).data?.id,
	).toBe(mediaId);
});

test("reference removal tools preserve user attachments", async () => {
	const conversationId = await createChat();
	const document = await createDocument();
	const references: AgentReferenceInput[] = [
		{ type: "media", mediaId: await createMedia() },
		...documentReferences(document),
	];
	await callReferenceTool(conversationId, runnerTools.registerReferences.name, {
		references,
	});
	expect((await link(conversationId, references)).error).toBeUndefined();
	const linked = await list(context, { conversationId, userId: null });
	assert(linked.data);
	for (const { id } of linked.data) {
		expect(
			await callReferenceTool(
				conversationId,
				runnerTools.removeReference.name,
				{ referenceId: id },
			),
		).toMatchObject({ failed: true });
	}
	expect((await list(context, { conversationId, userId: null })).data).toEqual(
		linked.data,
	);
});

test("reference registration checks the whole batch's read permissions and validates input", async () => {
	const userId = await createReader([Permissions.MediaRead]);
	const conversationId = await createChat(userId);
	const document = await createDocument();
	const media: AgentReferenceInput = {
		type: "media",
		mediaId: await createMedia(),
	};
	expect(
		await callReferenceTool(
			conversationId,
			runnerTools.registerReferences.name,
			{
				references: [media, ...documentReferences(document)],
			},
			userId,
		),
	).toMatchObject({ failed: true });
	expect(await mediaLinks(conversationId)).toEqual([]);
	expect(await documentLinks(conversationId)).toEqual([]);
	expect(
		await callReferenceTool(
			conversationId,
			runnerTools.registerReferences.name,
			{ references: [media] },
			userId,
		),
	).toMatchObject({ failed: false });
	expect(
		await callReferenceTool(
			conversationId,
			runnerTools.registerReferences.name,
			{ references: [] },
			userId,
		),
	).toMatchObject({ failed: true });
	expect(
		await callReferenceTool(
			conversationId,
			runnerTools.removeReference.name,
			{ referenceId: "invalid" },
			userId,
		),
	).toMatchObject({ failed: true });
});
