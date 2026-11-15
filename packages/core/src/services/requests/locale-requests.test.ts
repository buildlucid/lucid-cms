import { afterAll, assert, beforeAll, expect, test } from "vitest";
import applyCollectionMigrations from "../../libs/collection/apply-collection-migrations.js";
import defineCollection from "../../libs/collection/define-collection.js";
import field from "../../libs/collection/definitions/fields/field.js";
import planCollectionMigrations from "../../libs/collection/plan-collection-migrations.js";
import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { createTranslationStore } from "../../libs/i18n/index.js";
import { consumeJob } from "../../libs/jobs/consume/index.js";
import type { LucidUser } from "../../types/hono.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import { createTestQueueAdapter } from "../../utils/test-helpers/create-jobs-context.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import readVersionContent from "../documents-versions/helpers/read-version-content.js";
import updateVersion from "../documents-versions/update-single.js";
import upsertSingle from "../documents/upsert-single.js";
import syncCollections from "../sync/sync-collections.js";
import syncLocales from "../sync/sync-locales.js";
import approve from "./approve.js";
import complete from "./complete.js";
import createSingle from "./create-single.js";
import getSingle from "./get-single.js";
import refreshDocument from "./refresh-document.js";

const fixture = getTestConfig();
const collection = defineCollection({
	key: "locale_pages",
	mode: "multiple",
	localized: true,
	details: { labels: { singular: "Page", plural: "Pages" } },
	publishing: { environments: [{ key: "published", label: "Published" }] },
	fields: [field.text("title"), field.text("slug", { localized: false })],
});
const requiredCollection = defineCollection({
	key: "required_locale_pages",
	mode: "multiple",
	localized: true,
	details: { labels: { singular: "Page", plural: "Pages" } },
	fields: [field.text("title", { validation: { required: true } })],
});
let context: ServiceContext;
let editor: LucidUser;
let reviewer: LucidUser;

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: {
			...config,
			collections: [collection, requiredCollection],
			localization: {
				locales: [
					{ code: "en", label: "English" },
					{ code: "fr", label: "French" },
					{ code: "de", label: "German" },
				],
				defaultLocale: "en",
			},
		},
		database: await fixture.getDatabase(),
		queue: createTestQueueAdapter(async () => ({
			error: undefined,
			data: undefined,
		})),
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

	const createUser = async (name: string): Promise<LucidUser> => {
		const user = await context.db.kysely
			.insertInto("lucid_users")
			.values({
				email: `${name}@example.test`,
				username: name,
				secret: "test",
				super_admin: true,
			})
			.returning(["id", "email", "username"])
			.executeTakeFirstOrThrow();
		return { ...user, superAdmin: true, permissions: [] };
	};
	editor = await createUser("editor");
	reviewer = await createUser("reviewer");
});
afterAll(() => fixture.destroy());

const save = async (
	documentId: number | undefined,
	title: Record<string, string>,
	slug: string,
) => {
	const saved = await upsertSingle(context, {
		collectionKey: collection.key,
		documentId,
		userId: editor.id,
		fields: [
			{ key: "title", type: "text", translations: title },
			{ key: "slug", type: "text", value: slug },
		],
	});
	assert(saved.data, JSON.stringify(saved.error));
	return saved.data;
};

/** Opens a request for one document limited to `locales`: an update request by default, or a publish request. */
const openLocaleRequest = (props: {
	documentId: number;
	locales: string[];
	collectionKey?: string;
	type?: "update" | "publish";
	targets?: string[];
}) =>
	createSingle(context, {
		type: props.type ?? "update",
		title: "Translation",
		documents: [
			{
				collectionKey: props.collectionKey ?? collection.key,
				documentId: props.documentId,
				...(props.type === "publish"
					? { source: "latest", targets: props.targets }
					: {}),
			},
		],
		locales: props.locales,
		user: editor,
	});

const proposalOf = async (requestId: number) => {
	const read = await getSingle(context, { id: requestId, user: editor });
	const versionId = read.data?.documents[0]?.versionId;
	assert(versionId, JSON.stringify(read.error));
	return versionId;
};

const approveRequest = async (requestId: number) => {
	const approved = await approve(context, {
		id: requestId,
		ifUnchanged: (await getSingle(context, { id: requestId, user: reviewer }))
			.data?.reviewToken,
		user: reviewer,
	});
	assert(!approved.error, JSON.stringify(approved.error));
};

const readLatest = async (documentId: number) => {
	const read = await readVersionContent(context, {
		collectionKey: collection.key,
		documentId,
		versionType: "latest",
	});
	assert(read.data, JSON.stringify(read.error));
	return read.data.content.fields;
};

test("a French request lands only French, keeping English edits made meanwhile without needing a fresh look", async () => {
	const documentId = await save(
		undefined,
		{ en: "Hello", fr: "Salut" },
		"hello",
	);
	const created = await openLocaleRequest({ documentId, locales: ["fr"] });
	assert(created.data, JSON.stringify(created.error));

	//* the proposal keeps only its French change, even when sent other edits
	const edited = await updateVersion(context, {
		collectionKey: collection.key,
		documentId,
		versionId: await proposalOf(created.data.id),
		userId: editor.id,
		authUser: editor,
		fields: [
			{
				key: "title",
				type: "text",
				translations: { en: "Ignored", fr: "Bonjour" },
			},
			{ key: "slug", type: "text", value: "ignored" },
		],
	});
	assert(edited.data, JSON.stringify(edited.error));
	await approveRequest(created.data.id);

	await save(documentId, { en: "Hello there", fr: "Salut" }, "hello-there");
	const afterEdit = await getSingle(context, {
		id: created.data.id,
		user: editor,
	});
	assert(afterEdit.data, JSON.stringify(afterEdit.error));
	expect(afterEdit.data.approved).toBe(true);
	expect(afterEdit.data.blockers).toEqual([]);

	const queued = await complete(context, { id: created.data.id, user: editor });
	assert(queued.data, JSON.stringify(queued.error));
	expect(await consumeJob(context, queued.data)).toEqual({ type: "completed" });

	expect(await readLatest(documentId)).toEqual([
		expect.objectContaining({
			key: "title",
			translations: { en: "Hello there", fr: "Bonjour", de: null },
		}),
		expect.objectContaining({ key: "slug", value: "hello-there" }),
	]);
});

test("a French request is flagged when French changes on latest", async () => {
	const documentId = await save(undefined, { en: "Hi", fr: "Coucou" }, "hi");
	const created = await openLocaleRequest({ documentId, locales: ["fr"] });
	assert(created.data, JSON.stringify(created.error));

	await save(documentId, { en: "Hi", fr: "Salut" }, "hi");
	const read = await getSingle(context, { id: created.data.id, user: editor });
	assert(read.data, JSON.stringify(read.error));
	expect(read.data.blockers).toEqual(
		expect.arrayContaining([
			expect.objectContaining({ code: "acknowledge_required" }),
		]),
	);
});

test("only update requests can be limited to locales", async () => {
	const documentId = await save(undefined, { en: "Yo", fr: "Yo" }, "yo");
	const created = await openLocaleRequest({
		documentId,
		locales: ["fr"],
		type: "publish",
		targets: ["published"],
	});
	expect(created.error?.message).toEqual(
		expect.objectContaining({ key: "core.requests.locales.invalid" }),
	);
});

test("a locale-limited request only validates its own locales, so new locales translate one at a time", async () => {
	const saved = await upsertSingle(context, {
		collectionKey: requiredCollection.key,
		userId: editor.id,
		fields: [
			{
				key: "title",
				type: "text",
				translations: { en: "Hello", fr: "Salut", de: "Hallo" },
			},
		],
	});
	assert(saved.data, JSON.stringify(saved.error));
	//* as if French and German were added after the page was written
	const tables = await getTableNames(context, requiredCollection.key);
	assert(tables.data, JSON.stringify(tables.error));
	await context.db.kysely
		.updateTable(tables.data.documentFields)
		.set({ _title: null })
		.where("document_id", "=", saved.data)
		.where("locale", "in", ["fr", "de"])
		.execute();

	const created = await openLocaleRequest({
		documentId: saved.data,
		locales: ["de"],
		collectionKey: requiredCollection.key,
	});
	assert(created.data, JSON.stringify(created.error));

	const edited = await updateVersion(context, {
		collectionKey: requiredCollection.key,
		documentId: saved.data,
		versionId: await proposalOf(created.data.id),
		userId: editor.id,
		authUser: editor,
		fields: [
			{
				key: "title",
				type: "text",
				translations: { en: "Hello", de: "Hallo" },
			},
		],
	});
	assert(edited.data, JSON.stringify(edited.error));
	await approveRequest(created.data.id);
});

test("refreshing a publish copy keeps latest's translation records as they are", async () => {
	const documentId = await save(
		undefined,
		{ en: "Original", fr: "Ancien" },
		"page",
	);
	const created = await createSingle(context, {
		type: "publish",
		title: "Publish",
		documents: [
			{
				collectionKey: collection.key,
				documentId,
				source: "latest",
				targets: ["published"],
			},
		],
		user: editor,
	});
	assert(created.data, JSON.stringify(created.error));
	const request = await getSingle(context, {
		id: created.data.id,
		user: editor,
	});
	const document = request.data?.documents[0];
	assert(document?.versionId, JSON.stringify(request.error));

	//* French is retranslated, then English moves on, so French is out of date on latest
	await save(documentId, { en: "Original", fr: "Nouveau" }, "page");
	await save(documentId, { en: "Changed source", fr: "Nouveau" }, "page");
	const latest = await readVersionContent(context, {
		collectionKey: collection.key,
		documentId,
		versionType: "latest",
	});
	assert(latest.data);

	const refreshed = await refreshDocument(context, {
		id: created.data.id,
		requestDocumentId: document.id,
		user: editor,
	});
	assert(!refreshed.error, JSON.stringify(refreshed.error));
	const copy = await readVersionContent(context, {
		collectionKey: collection.key,
		documentId,
		versionId: document.versionId,
	});
	expect(copy.data?.contentId).toBe(latest.data.contentId);
	expect(copy.data?.content).toEqual(latest.data.content);
});
