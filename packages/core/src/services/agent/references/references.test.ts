import { randomUUID } from "node:crypto";
import { afterAll, assert, beforeAll, expect, test } from "vitest";
import constants from "../../../constants/constants.js";
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
	DocumentIdentitiesRepository,
	DocumentsRepository,
	DocumentVersionsRepository,
	MediaRepository,
	UserRolesRepository,
	UsersRepository,
} from "../../../libs/repositories/index.js";
import createToolkit from "../../../libs/toolkit/create-toolkit.js";
import { agentReferenceSchema } from "../../../schemas/agent-references.js";
import type {
	AgentReferenceInput,
	AgentRunnerToolName,
	MediaType,
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
import createUpload from "../create-upload.js";
import deleteReference from "../delete-reference.js";
import getMediaPreviews from "../get-media-previews.js";
import getReferences from "../get-references.js";
import checkUploadAccess from "../helpers/check-upload-access.js";
import insertConversation from "../helpers/insert-conversation.js";
import resolveRunSetup from "../helpers/resolve-run-setup.js";
import { runnerToolHandlers } from "../helpers/runner-tools/index.js";
import checkInput from "./check-input.js";
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
	features: {
		media: { upload: false, attach: false },
		documents: { attach: false },
	},
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
const createMedia = async (
	props: {
		owner_user_id?: number;
		is_system?: boolean;
		type?: MediaType;
		mime_type?: string;
		file_extension?: string;
	} = {},
) => {
	const Media = new MediaRepository(context.db);
	const result = await Media.createSingle({
		data: {
			key: randomUUID(),
			storage_adapter_key: "test",
			origin: "human",
			type: "image",
			mime_type: "image/png",
			file_extension: "png",
			file_size: 1,
			...props,
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
	const Documents = new DocumentsRepository(context.db);
	const document = await Documents.createSingle(
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
	const DocumentIdentities = new DocumentIdentitiesRepository(context.db);
	expect(
		(
			await DocumentIdentities.createSingle({
				data: { collection_key: collection.key, document_id: document.data.id },
			})
		).error,
	).toBeUndefined();
	const DocumentVersions = new DocumentVersionsRepository(context.db);
	const versions: number[] = [];
	for (const type of ["latest", "revision"]) {
		const version = await DocumentVersions.createVersion(
			{
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
	const AgentDocumentReferences = new AgentDocumentReferencesRepository(
		context.db,
	);
	const result = await AgentDocumentReferences.selectMultiple({
		select: ["document_id", "version_id"],
		where: [{ key: "conversation_id", operator: "=", value: conversationId }],
	});
	assert(result.data, JSON.stringify(result.error));
	return result.data;
};
const mediaLinks = async (conversationId: string) => {
	const AgentMediaReferences = new AgentMediaReferencesRepository(context.db);
	const result = await AgentMediaReferences.selectMultiple({
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
	const Media = new MediaRepository(context.db);
	expect(
		(
			await Media.deleteSingle({
				where: [{ key: "id", operator: "=", value: mediaId }],
			})
		).error,
	).toBeUndefined();
	for (const conversationId of [first, second]) {
		expect(await mediaLinks(conversationId)).toEqual([
			{ media_id: retainedId },
		]);
	}
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
	await context.db.kysely
		.insertInto("lucid_preview_sessions")
		.values({
			token_hash: randomUUID(),
			entry_collection_key: collection.key,
			entry_document_id: document.id,
			entry_version_type: "revision",
			entry_version_id: document.revisionId,
			mode: "scoped",
			expires_at: "2099-01-01T00:00:00.000Z",
		})
		.execute();
	await context.db.kysely
		.insertInto("lucid_document_references")
		.values({
			generation: randomUUID(),
			collection_key: collection.key,
			document_id: document.id,
			version_id: document.revisionId,
			source_table: "test",
			source_column: "body",
			locale: "",
			kind: "embedded",
			target_resource: "media",
			target_table: "lucid_media",
			target_id: 999,
		})
		.execute();
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
	expect(
		await context.db.kysely
			.selectFrom("lucid_document_version_identities")
			.select("version_id")
			.where("collection_key", "=", collection.key)
			.where("version_id", "=", document.revisionId)
			.execute(),
	).toEqual([]);
	expect(
		await context.db.kysely
			.selectFrom("lucid_preview_sessions")
			.select("id")
			.where("entry_collection_key", "=", collection.key)
			.where("entry_version_id", "=", document.revisionId)
			.execute(),
	).toEqual([]);
	expect(
		await context.db.kysely
			.selectFrom("lucid_document_references")
			.select("version_id")
			.where("collection_key", "=", collection.key)
			.where("version_id", "=", document.revisionId)
			.execute(),
	).toEqual([]);
});

test("delivery skips deleted resources while ordinary registration stays strict", async () => {
	const conversationId = await createChat();
	const mediaId = await createMedia();
	const missingId = await createMedia();
	const Media = new MediaRepository(context.db);
	expect(
		(
			await Media.deleteSingle({
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
	const Users = new UsersRepository(context.db);
	const user = await Users.createSingle({
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
		const UserRoles = new UserRolesRepository(context.db);
		expect(
			(
				await UserRoles.createSingle({
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
	const Media = new MediaRepository(context.db);
	expect(
		(
			await Media.updateSingle({
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
			await Media.updateSingle({
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

test("previews a linked video by its poster", async () => {
	const userId = await createReader();
	const conversationId = await createChat(userId);
	const videoId = await createMedia({
		type: "video",
		mime_type: "video/mp4",
		file_extension: "mp4",
	});
	expect(
		(await link(conversationId, [{ type: "media", mediaId: videoId }])).error,
	).toBeUndefined();
	const preview = async () =>
		(await getReferences(context, { id: conversationId, userId })).data?.find(
			(reference) =>
				reference.type === "media" && reference.mediaId === videoId,
		)?.previewUrl;

	expect(await preview()).toBeUndefined();

	const posterId = await createMedia();
	const Media = new MediaRepository(context.db);
	expect(
		(
			await Media.updateSingle({
				where: [{ key: "id", operator: "=", value: posterId }],
				data: { parent_media_id: videoId, relation_type: "poster" },
			})
		).error,
	).toBeUndefined();
	expect(await preview()).toEqual(expect.any(String));
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
			getAgentPermission(agent.key, "chat"),
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
			conversation_kind: userId === null ? "code-routine" : "chat",
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
	const Media = new MediaRepository(context.db);
	expect(
		(
			await Media.selectSingle({
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

test("managed links take over other links and only the toolkit can unlink them", async () => {
	const ownerId = await createReader();
	const conversationId = await createChat(ownerId);
	const document = await createDocument();
	const references: AgentReferenceInput[] = [
		{ type: "media", mediaId: await createMedia() },
		...documentReferences(document),
	];
	const attached: AgentReferenceInput = {
		type: "media",
		mediaId: await createMedia(),
	};
	expect((await link(conversationId, references)).error).toBeUndefined();
	const toolkit = createToolkit(context);
	expect(
		(
			await toolkit.agent.references.link({
				conversationId,
				toolName: "create_page",
				references,
			})
		).error,
	).toBeUndefined();
	//* attaching again leaves the tool in charge
	expect(
		(await link(conversationId, [...references, attached])).error,
	).toBeUndefined();

	const links = await list(context, { conversationId, userId: ownerId });
	assert(links.data);
	const managed = links.data.filter((reference) => reference.managed);
	expect(managed).toHaveLength(4);
	for (const reference of managed) {
		expect(reference.source).toEqual({ type: "tool", toolName: "create_page" });
		expect(
			await callReferenceTool(
				conversationId,
				runnerTools.removeReference.name,
				{ referenceId: reference.id },
				ownerId,
			),
		).toMatchObject({ failed: true });
		expect(
			(
				await deleteReference(context, {
					conversationId,
					referenceId: reference.id,
					userId: ownerId,
				})
			).error?.status,
		).toBe(409);
	}
	expect(
		(await list(context, { conversationId, userId: ownerId })).data,
	).toHaveLength(5);

	expect(
		(
			await toolkit.agent.references.unlink({
				conversationId,
				references: [...references, attached],
			})
		).error,
	).toBeUndefined();
	expect(await mediaLinks(conversationId)).toEqual([]);
	expect(await documentLinks(conversationId)).toEqual([]);
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

test("personal media is only linked and listed for its owner, and system media never is", async () => {
	const ownerId = await createReader([getAgentPermission(agent.key, "chat")]);
	const adminId = await createReader();
	const ownerChat = await createChat(ownerId);
	const adminChat = await createChat(adminId);
	const upload: AgentReferenceInput = {
		type: "media",
		mediaId: await createMedia({ owner_user_id: ownerId }),
	};
	const logo: AgentReferenceInput = {
		type: "media",
		mediaId: await createMedia({ is_system: true }),
	};

	//* the owner needs no media permissions for their own upload
	expect(
		await callReferenceTool(
			ownerChat,
			runnerTools.registerReferences.name,
			{ references: [upload] },
			ownerId,
		),
	).toMatchObject({ failed: false });
	const owned = await getReferences(context, {
		id: ownerChat,
		userId: ownerId,
	});
	expect(owned.data?.map((reference) => reference.type)).toEqual(["media"]);

	//* a super admin can see every file in the library, but someone's personal file fails as a missing one does
	const missing = await callReferenceTool(
		adminChat,
		runnerTools.registerReferences.name,
		{ references: [{ type: "media", mediaId: 2_147_483_000 }] },
		adminId,
	);
	expect(missing).toMatchObject({ failed: true });
	for (const references of [[upload], [logo]]) {
		expect(
			await callReferenceTool(
				adminChat,
				runnerTools.registerReferences.name,
				{ references },
				adminId,
			),
		).toEqual(missing);
	}
	expect(
		await callReferenceTool(
			ownerChat,
			runnerTools.registerReferences.name,
			{ references: [logo] },
			ownerId,
		),
	).toMatchObject({ failed: true });

	//* links made before an ownership change stay hidden from anyone else
	expect((await link(adminChat, [upload])).error).toBeUndefined();
	const hidden = await list(context, {
		conversationId: adminChat,
		userId: adminId,
	});
	expect(hidden.data).toEqual([]);
});

test("media previews register a bounded gallery and owners need no library permissions", async () => {
	const ownerId = await createReader([getAgentPermission(agent.key, "chat")]);
	const chatId = await createChat(ownerId);
	const mediaId = await createMedia({ owner_user_id: ownerId });
	const outcome = await callReferenceTool(
		chatId,
		runnerTools.previewMedia.name,
		{ mediaIds: [mediaId, mediaId] },
		ownerId,
	);
	expect(outcome).toMatchObject({
		failed: false,
		output: { mediaIds: [mediaId] },
		widgets: [
			{ key: "lucid-media-preview", version: 1, data: { mediaIds: [mediaId] } },
		],
	});
	expect(await mediaLinks(chatId)).toHaveLength(1);
	const preview = await getMediaPreviews(context, {
		id: chatId,
		userId: ownerId,
	});
	expect(preview.error).toBeUndefined();
	expect(preview.data?.map((item) => item.id)).toEqual([mediaId]);
	const overLimit = Array.from(
		{ length: constants.agent.previewMediaLimit + 1 },
		(_, index) => index + 1,
	);
	for (const mediaIds of [[], overLimit, [0], ["1"]]) {
		expect(
			await callReferenceTool(
				chatId,
				runnerTools.previewMedia.name,
				{ mediaIds },
				ownerId,
			),
		).toMatchObject({ failed: true });
	}
});

test("media previews show images, video and audio while other linked files stay as references", async () => {
	const ownerId = await createReader([getAgentPermission(agent.key, "chat")]);
	const chatId = await createChat(ownerId);
	const richMediaIds = await Promise.all([
		createMedia({ owner_user_id: ownerId }),
		createMedia({
			owner_user_id: ownerId,
			type: "video",
			mime_type: "video/mp4",
			file_extension: "mp4",
		}),
		createMedia({
			owner_user_id: ownerId,
			type: "audio",
			mime_type: "audio/mpeg",
			file_extension: "mp3",
		}),
	]);
	expect(
		await callReferenceTool(
			chatId,
			runnerTools.previewMedia.name,
			{ mediaIds: richMediaIds },
			ownerId,
		),
	).toMatchObject({ failed: false, output: { mediaIds: richMediaIds } });
	const pdfId = await createMedia({
		owner_user_id: ownerId,
		type: "document",
		mime_type: "application/pdf",
		file_extension: "pdf",
	});
	expect(
		(await link(chatId, [{ type: "media", mediaId: pdfId }])).error,
	).toBeUndefined();
	const previews = await getMediaPreviews(context, {
		id: chatId,
		userId: ownerId,
	});
	expect(previews.error).toBeUndefined();
	expect(previews.data?.map((item) => item.id).sort()).toEqual(
		[...richMediaIds].sort(),
	);
	expect(await mediaLinks(chatId)).toHaveLength(4);
});

test.each([
	{ type: "document", mime_type: "application/pdf", file_extension: "pdf" },
	{ type: "document", mime_type: "text/plain", file_extension: "txt" },
	{ type: "archive", mime_type: "application/zip", file_extension: "zip" },
	{
		type: "unknown",
		mime_type: "application/octet-stream",
		file_extension: "bin",
	},
] satisfies {
	type: MediaType;
	mime_type: string;
	file_extension: string;
}[])("media previews reject $mime_type before linking any items in a mixed gallery", async (file) => {
	const ownerId = await createReader([getAgentPermission(agent.key, "chat")]);
	const chatId = await createChat(ownerId);
	const imageId = await createMedia({ owner_user_id: ownerId });
	const fileId = await createMedia({ ...file, owner_user_id: ownerId });
	const outcome = await callReferenceTool(
		chatId,
		runnerTools.previewMedia.name,
		{ mediaIds: [imageId, fileId] },
		ownerId,
	);
	expect(outcome).toMatchObject({
		failed: true,
		output: {
			error: context.translate("server:agent.media.preview.unsupported"),
		},
	});
	expect(outcome).not.toHaveProperty("widgets");
	expect(await mediaLinks(chatId)).toEqual([]);
});

test("media previews enforce ownership, viewer access and current deletion state", async () => {
	const ownerId = await createReader([getAgentPermission(agent.key, "chat")]);
	const otherId = await createReader();
	const chatId = await createChat(ownerId);
	const mediaId = await createMedia({ owner_user_id: ownerId });
	const otherChat = await createChat(otherId);
	expect(
		await callReferenceTool(
			otherChat,
			runnerTools.previewMedia.name,
			{ mediaIds: [mediaId] },
			otherId,
		),
	).toMatchObject({ failed: true });
	expect(
		await callReferenceTool(
			chatId,
			runnerTools.previewMedia.name,
			{ mediaIds: [mediaId] },
			ownerId,
		),
	).toMatchObject({ failed: false });
	expect(
		(
			await getMediaPreviews(context, {
				id: chatId,
				userId: otherId,
			})
		).error?.status,
	).toBe(404);
	await context.db.kysely
		.updateTable("lucid_media")
		.set({ is_deleted: true })
		.where("id", "=", mediaId)
		.execute();
	expect(
		(
			await getMediaPreviews(context, {
				id: chatId,
				userId: ownerId,
			})
		).data,
	).toEqual([]);
});

test("upload-only agents accept owned files without enabling existing media or document attachments", async () => {
	const ownerId = await createReader([getAgentPermission(agent.key, "chat")]);
	const uploadOnly = defineAgent({
		key: agent.key,
		name: agent.name,
		description: agent.description,
		features: {
			media: { upload: true, attach: false },
			documents: { attach: false },
		},
	});
	const uploadContext = {
		...context,
		config: {
			...context.config,
			ai: { ...context.config.ai, agents: { definitions: [uploadOnly] } },
		},
	};
	const mediaId = await createMedia({ owner_user_id: ownerId });
	expect(
		(
			await checkUploadAccess(uploadContext, {
				userId: ownerId,
				agentKey: agent.key,
			})
		).error,
	).toBeUndefined();
	expect(
		(
			await checkInput(uploadContext, {
				userId: ownerId,
				agentKey: agent.key,
				references: [{ type: "media", mediaId }],
			})
		).error,
	).toBeUndefined();
	const libraryId = await createMedia();
	expect(
		(
			await checkInput(uploadContext, {
				userId: ownerId,
				agentKey: agent.key,
				references: [{ type: "media", mediaId: libraryId }],
			})
		).error?.status,
	).toBe(403);
});

test("chat uploads only take the uploader's own images as posters", async () => {
	const ownerId = await createReader([getAgentPermission(agent.key, "chat")]);
	const uploadContext = {
		...context,
		config: {
			...context.config,
			ai: {
				...context.config.ai,
				agents: {
					definitions: [
						defineAgent({
							key: agent.key,
							name: agent.name,
							description: agent.description,
						}),
					],
				},
			},
		},
	};
	const user = {
		id: ownerId,
		username: "owner",
		email: "owner@example.test",
		superAdmin: false,
		permissions: [getAgentPermission(agent.key, "chat")],
	};
	const libraryId = await createMedia();
	const othersId = await createMedia({
		owner_user_id: await createReader([]),
	});

	for (const posterId of [libraryId, othersId]) {
		const upload = await createUpload(uploadContext, {
			agentKey: agent.key,
			key: randomUUID(),
			fileName: "clip.mp4",
			posterId,
			user,
		});
		expect(upload.error?.status).toBe(404);
	}
	const library = await new MediaRepository(context.db).selectSingle({
		select: ["owner_user_id", "parent_media_id"],
		where: [{ key: "id", operator: "=", value: libraryId }],
	});
	expect(library.data).toEqual({ owner_user_id: null, parent_media_id: null });
});
