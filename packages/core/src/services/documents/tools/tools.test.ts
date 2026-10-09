import { randomUUID } from "node:crypto";
import { afterAll, assert, beforeAll, expect, test } from "vitest";
import defineAgent from "../../../libs/agent/define-agent.js";
import runnerTools from "../../../libs/agent/runner-tools.js";
import applyCollectionMigrations from "../../../libs/collection/apply-collection-migrations.js";
import BrickBuilder from "../../../libs/collection/builders/brick-builder/index.js";
import CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import planCollectionMigrations from "../../../libs/collection/plan-collection-migrations.js";
import { getTableNames } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import { getCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import createToolkit from "../../../libs/toolkit/create-toolkit.js";
import type { DocumentActor } from "../../../libs/toolkit/documents/types.js";
import { executeAgentTool } from "../../../libs/tools/execute-tool.js";
import { agentTools } from "../../../libs/tools/lucid-tools.js";
import type { AgentToolDefinition } from "../../../libs/tools/types.js";
import type { LucidUser } from "../../../types/hono.js";
import isPlainObject from "../../../utils/helpers/is-plain-object.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import insertConversation from "../../agent/helpers/insert-conversation.js";
import resolveRunSetup from "../../agent/helpers/resolve-run-setup.js";
import { runnerToolHandlers } from "../../agent/helpers/runner-tools/index.js";
import list from "../../agent/references/list.js";
import register from "../../agent/references/register.js";
import { outputSchema as describeOutputSchema } from "../../collections/tools/describe/schema.js";
import createRole from "../../roles/create-single.js";
import syncCollections from "../../sync/sync-collections.js";
import syncLocales from "../../sync/sync-locales.js";
import publish from "../publish.js";
import { outputSchema as readOutputSchema } from "./get/schema.js";
import { writeOutputSchema } from "./schema.js";

const fixture = getTestConfig();
const pages = new CollectionBuilder("agent_pages", {
	mode: "multiple",
	localized: true,
	details: { labels: { singular: "Page", plural: "Pages" } },
	publishing: { targets: [{ key: "production", label: "Production" }] },
	bricks: {
		builder: [new BrickBuilder("hero").addText("heading", { localized: true })],
		fixed: [new BrickBuilder("seo").addText("description").addMedia("image")],
	},
})
	.addText("title", { localized: true, useAsLabel: true })
	.addRichText("body", { localized: false })
	.addRepeater("links")
	.addText("label", { localized: true })
	.endRepeater();
const reviewed = new CollectionBuilder("agent_reviewed_pages", {
	mode: "multiple",
	details: { labels: { singular: "Reviewed page", plural: "Reviewed pages" } },
	publishing: { review: { create: true, delete: true } },
}).addText("title", { useAsLabel: true });
const required = new CollectionBuilder("agent_required_pages", {
	mode: "multiple",
	localized: true,
	details: { labels: { singular: "Required page", plural: "Required pages" } },
	bricks: {
		builder: [
			new BrickBuilder("banner")
				.addTab("content_tab")
				.addText("title", { localized: true, validation: { required: true } }),
		],
	},
}).addText("title", {
	localized: true,
	useAsLabel: true,
	validation: { required: true },
});
const agent = defineAgent({
	key: "editor",
	name: "Editor",
	description: "Edits pages.",
});

let context: ServiceContext;
let user: LucidUser;
let userId: number;

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: {
			...config,
			collections: [pages, reviewed, required],
			localization: {
				defaultLocale: "en",
				locales: [
					{ code: "en", label: "English" },
					{ code: "fr", label: "French" },
				],
			},
			ai: { ...config.ai, agents: { definitions: [agent] } },
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

	const inserted = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: `${randomUUID()}@example.test`,
			username: randomUUID(),
			secret: "test",
			super_admin: true,
		})
		.returning(["id", "email", "username"])
		.executeTakeFirstOrThrow();
	user = { ...inserted, superAdmin: true, permissions: [] };
	userId = user.id;
});
afterAll(() => fixture.destroy());

/** Starts a chat with a run, as the runner would before calling tools. */
const startRun = async (principal: "user" | "system" = "user") => {
	const runUserId = principal === "user" ? userId : null;
	const conversation = await insertConversation(context, {
		agentKey: agent.key,
		userId: runUserId,
	});
	assert(conversation.data, JSON.stringify(conversation.error));
	const runId = randomUUID();
	await context.db.kysely
		.insertInto("lucid_agent_runs")
		.values({
			id: runId,
			conversation_id: conversation.data.id,
			user_id: runUserId,
			status: "running",
		})
		.execute();

	const actor: DocumentActor =
		runUserId === null
			? { kind: "system", agentRunId: runId }
			: { kind: "user", userId: runUserId, agentRunId: runId };
	const call = async (tool: AgentToolDefinition, input: unknown) => {
		const result = await executeAgentTool({
			context,
			tool,
			input,
			execution: {
				authority: {
					principal:
						runUserId === null
							? { type: "system" }
							: { type: "user", userId: runUserId },
					permissions: [],
					superAdmin: true,
				},
				actor,
				signal: AbortSignal.timeout(10_000),
				operationId: `${runId}:${randomUUID()}`,
				run: {
					id: runId,
					conversationId: conversation.data.id,
					userId: runUserId,
				},
			},
		});
		assert(result.type === "success", JSON.stringify(result));
		return result.data.output;
	};

	return {
		runId,
		conversationId: conversation.data.id,
		call,
		fail: async (tool: AgentToolDefinition, input: unknown) => {
			const result = await executeAgentTool({
				context,
				tool,
				input,
				execution: {
					authority: {
						principal: { type: "user", userId },
						permissions: [],
						superAdmin: true,
					},
					actor,
					signal: AbortSignal.timeout(10_000),
					operationId: `${runId}:${randomUUID()}`,
					run: { id: runId, conversationId: conversation.data.id, userId },
				},
			});
			assert(result.type === "failed", JSON.stringify(result));
			return result.message;
		},
		write: async (tool: AgentToolDefinition, input: unknown) =>
			writeOutputSchema.parse(await call(tool, input)),
		read: async (input: Record<string, unknown>) =>
			readOutputSchema.parse(
				await call(getDocument, { collectionKey: pages.key, ...input }),
			).data,
	};
};

const tools = agentTools.editing();
const direct = agentTools.editing({ direct: true });
const [create, update, remove, unpublish] = tools;
const [directCreate, directUpdate, directDelete, directUnpublish] = direct;
const getDocument = agentTools.getDocument();
assert(create && update && remove && unpublish);
assert(directCreate && directUpdate && directDelete && directUnpublish);

const createPage = async () => {
	const created = await createToolkit(context).documents.createSingle({
		collectionKey: pages.key,
		actor: { kind: "system" },
		data: {
			fields: {
				title: { en: "Hello", fr: "Bonjour" },
				links: [{ fields: { label: { en: "Read", fr: "Lire" } } }],
			},
			bricks: {
				builder: [
					{
						key: "hero",
						fields: { heading: { en: "Welcome", fr: "Bienvenue" } },
					},
				],
			},
		},
	});
	assert(created.data, JSON.stringify(created.error));
	return created.data.id;
};

test("creates documents as create requests attributed to the run, then edits their proposal", async () => {
	const run = await startRun();
	const created = await run.write(create, {
		collectionKey: pages.key,
		fields: {
			title: "Spring launch",
			body: "<p>Hello <strong>world</strong></p>",
			links: [{ fields: { label: "Read more" } }],
		},
		bricks: [
			{ key: "seo", fields: { description: "Launch page" } },
			{ key: "hero", fields: { heading: "Spring is here" } },
		],
	});
	expect(created).toMatchObject({
		outcome: "requested",
		request: { type: "create" },
	});
	assert(created.request);
	const requestId = created.request.id;
	const documentId = created.document.id;

	const tables = await getTableNames(context, pages.key);
	assert(tables.data);
	const document = await context.db.kysely
		.selectFrom(tables.data.document)
		.select(["create_request_id", "created_by", "created_by_run_id"])
		.where("id", "=", documentId)
		.executeTakeFirstOrThrow();
	expect(document).toEqual({
		create_request_id: requestId,
		created_by: userId,
		created_by_run_id: run.runId,
	});
	const request = await context.db.kysely
		.selectFrom("lucid_requests")
		.select(["created_by", "created_by_run_id"])
		.where("id", "=", requestId)
		.executeTakeFirstOrThrow();
	expect(request).toEqual({ created_by: userId, created_by_run_id: run.runId });

	const references = await list(context, {
		conversationId: run.conversationId,
		userId,
	});
	expect(references.data).toEqual([
		expect.objectContaining({ type: "request", requestId, managed: true }),
	]);
	//* the requested document only exists in its request, so it is linked as the request
	const registered = await register(context, {
		conversationId: run.conversationId,
		references: [
			{ type: "document", collectionKey: pages.key, documentId: documentId },
		],
		source: { type: "tool", toolName: "lucid_register_references" },
	});
	expect(registered.data).toEqual([
		expect.objectContaining({ type: "request", requestId }),
	]);

	const proposal = await run.read({ id: documentId, requestId });
	expect(proposal.fields).toMatchObject({
		title: "Spring launch",
		body: "<p>Hello <strong>world</strong></p>",
		links: [{ ref: expect.any(String), fields: { label: "Read more" } }],
	});
	expect(proposal.bricks).toEqual([
		{
			key: "seo",
			type: "fixed",
			fields: { description: "Launch page", image: [] },
		},
		{
			ref: expect.any(String),
			key: "hero",
			type: "builder",
			fields: { heading: "Spring is here" },
		},
	]);

	const updated = await run.write(update, {
		collectionKey: pages.key,
		id: documentId,
		requestId,
		fields: { title: "Summer launch" },
	});
	expect(updated).toMatchObject({
		outcome: "requested",
		request: { id: requestId, type: "create" },
	});
	const reread = await run.read({ id: documentId, requestId });
	expect(reread.fields).toMatchObject({
		title: "Summer launch",
		body: "<p>Hello <strong>world</strong></p>",
	});
});

test("proposes updates in one request per chat and leaves latest unchanged", async () => {
	const documentId = await createPage();
	const run = await startRun();

	const first = await run.write(update, {
		collectionKey: pages.key,
		id: documentId,
		fields: { title: "First change" },
	});
	const second = await run.write(update, {
		collectionKey: pages.key,
		id: documentId,
		fields: { body: "<p>Second change</p>" },
	});
	expect(first).toMatchObject({
		outcome: "requested",
		request: { type: "publish" },
	});
	expect(second.request).toEqual(first.request);

	assert(first.request);
	const requestId = first.request.id;
	const proposal = await run.read({ id: documentId, requestId });
	expect(proposal.fields).toMatchObject({
		title: "First change",
		body: "<p>Second change</p>",
	});
	const latest = await run.read({ id: documentId });
	expect(latest.fields).toMatchObject({ title: "Hello" });

	const events = await context.db.kysely
		.selectFrom("lucid_request_events")
		.select(["type", "agent_run_id"])
		.where("request_id", "=", requestId)
		.where("type", "=", "proposal_edited")
		.execute();
	expect(events).toEqual([
		{ type: "proposal_edited", agent_run_id: run.runId },
	]);
});

test("direct updates write one locale and merge bricks and items by ref", async () => {
	const documentId = await createPage();
	const run = await startRun();
	const read = await run.read({ id: documentId, contentLocale: "fr" });
	expect(read.fields).toMatchObject({
		title: "Bonjour",
		links: [{ fields: { label: "Lire" } }],
	});
	const links = read.fields.links;
	const linkRef =
		Array.isArray(links) && isPlainObject(links[0]) ? links[0].ref : undefined;
	const heroRef = read.bricks.find((brick) => brick.key === "hero")?.ref;
	assert(typeof linkRef === "string" && heroRef);

	const updated = await run.write(directUpdate, {
		collectionKey: pages.key,
		id: documentId,
		contentLocale: "fr",
		fields: {
			title: "Salut",
			links: [{ ref: linkRef, fields: { label: "Découvrir" } }],
		},
		bricks: [
			{ ref: heroRef, fields: { heading: "Le printemps" } },
			{ key: "hero", fields: { heading: "Nouveau" } },
		],
	});
	expect(updated).toMatchObject({ outcome: "applied", request: null });

	//* what documents_get returns can be sent straight back, and a ref's key must match
	const reread = await run.read({ id: documentId, contentLocale: "fr" });
	await run.write(directUpdate, {
		collectionKey: pages.key,
		id: documentId,
		contentLocale: "fr",
		fields: reread.fields,
		bricks: reread.bricks,
	});
	expect(
		await run.fail(directUpdate, {
			collectionKey: pages.key,
			id: documentId,
			bricks: [{ ref: heroRef, key: "seo", fields: {} }],
		}),
	).toContain(heroRef);

	const editable = await createToolkit(context).documents.getEditable({
		collectionKey: pages.key,
		id: documentId,
	});
	assert(editable.data, JSON.stringify(editable.error));
	expect(editable.data.data.fields).toMatchObject({
		title: { en: "Hello", fr: "Salut" },
		links: [
			{ ref: linkRef, fields: { label: { en: "Read", fr: "Découvrir" } } },
		],
	});
	expect(editable.data.data.bricks.builder).toMatchObject([
		{
			ref: heroRef,
			fields: { heading: { en: "Welcome", fr: "Le printemps" } },
		},
		{ key: "hero", fields: { heading: { en: "", fr: "Nouveau" } } },
	]);

	const tables = await getTableNames(context, pages.key);
	assert(tables.data);
	const document = await context.db.kysely
		.selectFrom(tables.data.document)
		.select(["updated_by", "updated_by_run_id"])
		.where("id", "=", documentId)
		.executeTakeFirstOrThrow();
	expect(document).toEqual({
		updated_by: userId,
		updated_by_run_id: run.runId,
	});
});

test("deletes and unpublishes through requests unless direct", async () => {
	const documentId = await createPage();
	const published = await publish(context, {
		collectionKey: pages.key,
		documentId,
		target: "production",
		user,
	});
	expect(published.error).toBeUndefined();
	const run = await startRun();

	const deleted = await run.write(remove, {
		collectionKey: pages.key,
		id: documentId,
	});
	expect(deleted).toMatchObject({
		outcome: "requested",
		request: { type: "delete" },
	});
	const unpublished = await run.write(unpublish, {
		collectionKey: pages.key,
		id: documentId,
		target: "production",
	});
	expect(unpublished).toMatchObject({
		outcome: "requested",
		request: { type: "unpublish" },
	});
	expect(
		await run.write(directUnpublish, {
			collectionKey: pages.key,
			id: documentId,
			target: "production",
		}),
	).toMatchObject({ outcome: "applied", request: null });

	const binned = await run.write(directDelete, {
		collectionKey: pages.key,
		id: documentId,
	});
	expect(binned).toMatchObject({ outcome: "applied", request: null });
	const tables = await getTableNames(context, pages.key);
	assert(tables.data);
	const document = await context.db.kysely
		.selectFrom(tables.data.document)
		.select(["is_deleted"])
		.where("id", "=", documentId)
		.executeTakeFirstOrThrow();
	expect(Boolean(document.is_deleted)).toBe(true);
});

test("direct writes still open requests where the collection requires review", async () => {
	const run = await startRun();
	const created = await run.write(directCreate, {
		collectionKey: reviewed.key,
		fields: { title: "Reviewed" },
	});
	expect(created).toMatchObject({
		outcome: "requested",
		request: { type: "create" },
	});
});

test("routines defined in code open requests as the system", async () => {
	const run = await startRun("system");
	const created = await run.write(create, {
		collectionKey: pages.key,
		fields: { title: "From a routine" },
	});
	assert(created.request);
	const request = await context.db.kysely
		.selectFrom("lucid_requests")
		.select(["created_by", "created_by_run_id"])
		.where("id", "=", created.request.id)
		.executeTakeFirstOrThrow();
	expect(request).toEqual({ created_by: null, created_by_run_id: run.runId });
});

test("describes tab fields by their stored paths, explains invalid fields and accepts every language at once", async () => {
	const run = await startRun();
	const described = await run.call(agentTools.describeCollection(), {
		collectionKey: required.key,
	});
	const paths = describeOutputSchema
		.parse(described)
		.data.flatMap((entry) => (entry.kind === "field" ? [entry.path] : []));
	expect(paths).toEqual([["title"], ["title"]]);

	const message = await run.fail(create, {
		collectionKey: required.key,
		fields: { title: "Dogs" },
		bricks: [{ key: "banner", fields: { title: "Medieval dogs" } }],
	});
	expect(message.split("\n")).toEqual([
		"There was an error validating some fields.",
		"fields.title (fr): Please enter a value for this field",
		"bricks.banner[0].title (fr): Please enter a value for this field",
	]);

	const created = await run.write(create, {
		collectionKey: required.key,
		fields: { title: { en: "Dogs", fr: "Chiens" } },
		bricks: [
			{
				key: "banner",
				fields: { title: { en: "Medieval dogs", fr: "Chiens médiévaux" } },
			},
		],
	});
	expect(created).toMatchObject({ outcome: "requested" });
});

test("accepts a fixed brick by ref and a single media ID, and explains media outside the library", async () => {
	const documentId = await createPage();
	const run = await startRun();
	const createMedia = async (ownerUserId: number | null) => {
		const media = await context.db.kysely
			.insertInto("lucid_media")
			.values({
				key: randomUUID(),
				storage_adapter_key: "test",
				origin: "human",
				type: "image",
				mime_type: "image/png",
				file_extension: "png",
				file_size: 1,
				owner_user_id: ownerUserId,
			})
			.returning(["id"])
			.executeTakeFirstOrThrow();
		return media.id;
	};
	const library = await createMedia(null);
	const personal = await createMedia(userId);

	const message = await run.fail(directUpdate, {
		collectionKey: pages.key,
		id: documentId,
		bricks: [{ ref: "seo", fields: { image: personal } }],
	});
	expect(message.split("\n")).toEqual([
		"There was an error validating some fields.",
		`bricks.seo.image[0]: Media ${personal} isn't in the media library. Personal uploads need moving to the library before they can be used in content.`,
	]);

	await run.write(directUpdate, {
		collectionKey: pages.key,
		id: documentId,
		bricks: [{ ref: "seo", fields: { image: library } }],
	});
	const read = await run.read({
		id: documentId,
		include: ["bricks", "refs.media"],
	});
	expect(read.bricks).toContainEqual({
		key: "seo",
		type: "fixed",
		fields: { description: "", image: [library] },
	});
	const refs = await run.call(getDocument, {
		collectionKey: pages.key,
		id: documentId,
		include: ["bricks", "refs.media"],
	});
	expect(readOutputSchema.parse(refs).meta.refs?.media).toEqual([
		expect.objectContaining({ id: library }),
	]);
});

test("registering a requested document needs access to its request", async () => {
	const run = await startRun();
	const created = await run.write(create, {
		collectionKey: pages.key,
		fields: { title: { en: "Requested", fr: "Demandé" } },
	});

	const role = await createRole(context, {
		name: randomUUID(),
		permissions: [getCollectionPermission(pages.key, "read")],
	});
	assert(role.data, JSON.stringify(role.error));
	const reader = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: `${randomUUID()}@example.test`,
			username: randomUUID(),
			secret: "test",
			super_admin: false,
		})
		.returning(["id"])
		.executeTakeFirstOrThrow();
	await context.db.kysely
		.insertInto("lucid_user_roles")
		.values({ user_id: reader.id, role_id: role.data })
		.execute();
	const conversation = await insertConversation(context, {
		agentKey: agent.key,
		userId: reader.id,
	});
	assert(conversation.data, JSON.stringify(conversation.error));

	const handler = runnerToolHandlers.get(runnerTools.registerReferences.name);
	assert(handler);
	const result = await handler(context, {
		call: {
			id: randomUUID(),
			name: runnerTools.registerReferences.name,
			input: {
				references: [
					{
						type: "document",
						collectionKey: pages.key,
						documentId: created.document.id,
					},
				],
			},
		},
		run: {
			id: randomUUID(),
			conversation_id: conversation.data.id,
			routine_id: null,
			user_id: reader.id,
			execution_version: 1,
			agent_key: agent.key,
			conversation_user_id: reader.id,
			conversation_kind: "chat",
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
				principal: { type: "user", userId: reader.id },
				superAdmin: false,
				permissions: [getCollectionPermission(pages.key, "read")],
			},
		}),
	});
	expect(result).toMatchObject({ failed: true });
	expect(JSON.stringify(result)).not.toContain("Requested");
});

test("keeps unchanged rich text exactly and checks the key of a fixed brick named by ref", async () => {
	const body = {
		type: "doc",
		content: [
			{
				type: "paragraph",
				content: [{ type: "text", text: "  Hello  world  " }],
			},
		],
	};
	const created = await createToolkit(context).documents.createSingle({
		collectionKey: pages.key,
		actor: { kind: "system" },
		data: { fields: { title: { en: "Spacing", fr: "Espaces" }, body } },
	});
	assert(created.data, JSON.stringify(created.error));
	const documentId = created.data.id;
	const run = await startRun();

	const read = await run.read({ id: documentId });
	await run.write(directUpdate, {
		collectionKey: pages.key,
		id: documentId,
		fields: { ...read.fields, title: "Spaced" },
		bricks: read.bricks,
	});
	const editable = await createToolkit(context).documents.getEditable({
		collectionKey: pages.key,
		id: documentId,
	});
	assert(editable.data, JSON.stringify(editable.error));
	expect(editable.data.data.fields).toMatchObject({
		title: { en: "Spaced", fr: "Espaces" },
		body,
	});

	expect(
		await run.fail(directUpdate, {
			collectionKey: pages.key,
			id: documentId,
			bricks: [{ ref: "seo", key: "hero", fields: { description: "Wrong" } }],
		}),
	).toContain("seo");
});

test("keeps rich text spacing as written, for untouched text and spacing fixes alike", async () => {
	const paragraph = (text: string) => ({
		type: "paragraph",
		content: [{ type: "text", text }],
	});
	const item = (text: string) => ({
		type: "listItem",
		content: [paragraph(text)],
	});
	const created = await createToolkit(context).documents.createSingle({
		collectionKey: pages.key,
		actor: { kind: "system" },
		data: {
			fields: {
				title: { en: "Spacing", fr: "Espaces" },
				body: {
					type: "doc",
					content: [
						paragraph("First"),
						paragraph("  Keep  this  spacing  "),
						{ type: "bulletList", content: [item("  a  "), item("  b  ")] },
					],
				},
			},
		},
	});
	assert(created.data, JSON.stringify(created.error));
	const run = await startRun();
	const read = await run.read({ id: created.data.id });
	assert(typeof read.fields.body === "string");

	await run.write(directUpdate, {
		collectionKey: pages.key,
		id: created.data.id,
		fields: {
			body: read.fields.body
				.replace("First", "Changed first")
				.replace("<p>  Keep", "<p>Inserted</p><p>  Keep")
				.replace("  a  ", "A"),
		},
	});
	const editable = await createToolkit(context).documents.getEditable({
		collectionKey: pages.key,
		id: created.data.id,
	});
	assert(editable.data, JSON.stringify(editable.error));
	expect(editable.data.data.fields.body).toEqual({
		type: "doc",
		content: [
			paragraph("Changed first"),
			paragraph("Inserted"),
			paragraph("  Keep  this  spacing  "),
			{ type: "bulletList", content: [item("A"), item("  b  ")] },
		],
	});

	const fixed = await run.read({ id: created.data.id });
	assert(typeof fixed.fields.body === "string");
	await run.write(directUpdate, {
		collectionKey: pages.key,
		id: created.data.id,
		fields: {
			body: fixed.fields.body.replace(
				"  Keep  this  spacing  ",
				"Keep this spacing",
			),
		},
	});
	const after = await createToolkit(context).documents.getEditable({
		collectionKey: pages.key,
		id: created.data.id,
	});
	assert(after.data, JSON.stringify(after.error));
	expect(after.data.data.fields.body).toMatchObject({
		content: [
			paragraph("Changed first"),
			paragraph("Inserted"),
			paragraph("Keep this spacing"),
			{ type: "bulletList", content: [item("A"), item("  b  ")] },
		],
	});
});
