import { afterAll, assert, beforeAll, expect, test } from "vitest";
import applyCollectionMigrations from "../../libs/collection/apply-collection-migrations.js";
import CollectionBuilder from "../../libs/collection/builders/collection-builder/index.js";
import resolveCollectionLocalization from "../../libs/collection/helpers/resolve-collection-localization.js";
import planCollectionMigrations from "../../libs/collection/plan-collection-migrations.js";
import { createTranslationStore } from "../../libs/i18n/index.js";
import hashTranslationText from "../../libs/translations/hash-translation-text.js";
import type { LucidUser } from "../../types/hono.js";
import type { TranslationChange } from "../../types/response.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import { createTestQueueAdapter } from "../../utils/test-helpers/create-jobs-context.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import heartbeat from "../document-editors/heartbeat.js";
import readDocumentContent from "../documents/helpers/read-document-content.js";
import upsertSingle from "../documents/upsert-single.js";
import createRequest from "../requests/create-single.js";
import syncCollections from "../sync/sync-collections.js";
import syncLocales from "../sync/sync-locales.js";
import getRequestProposals from "./helpers/get-request-proposals.js";
import saveTranslatedLatest from "./helpers/save-translated-latest.js";
import saveTranslatedProposals from "./helpers/save-translated-proposals.js";
import translateDocuments from "./translate-documents.js";

const fixture = getTestConfig();
const collection = new CollectionBuilder("translated_pages", {
	mode: "multiple",
	localized: true,
	details: { labels: { singular: "Page", plural: "Pages" } },
}).addText("title");
let context: ServiceContext;
let editor: LucidUser;

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: {
			...config,
			collections: [collection],
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

	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: "editor@example.test",
			username: "editor",
			secret: "test",
			super_admin: true,
		})
		.returning(["id", "email", "username"])
		.executeTakeFirstOrThrow();
	editor = { ...user, superAdmin: true, permissions: [] };
});
afterAll(() => fixture.destroy());

const localization = () =>
	resolveCollectionLocalization({
		localization: context.config.localization,
		collection,
	});

const savePage = async (title: Record<string, string>) => {
	const saved = await upsertSingle(context, {
		collectionKey: collection.key,
		userId: editor.id,
		fields: [{ key: "title", type: "text", translations: title }],
	});
	assert(saved.data, JSON.stringify(saved.error));
	return saved.data;
};

const openRequest = async (documentId: number, locales?: string[]) => {
	const created = await createRequest(context, {
		type: "publish",
		title: "Edits",
		documents: [
			{
				collectionKey: collection.key,
				documentId,
				source: "latest",
				targets: ["latest"],
			},
		],
		locales,
		user: editor,
	});
	assert(created.data, JSON.stringify(created.error));
	return created.data.id;
};

/** A machine translation of `source` into French, as Lucid AI returns it. */
const frenchChange = (
	documentId: number,
	source: string,
	value: string,
): TranslationChange & { documentId: number } => ({
	documentId,
	brick: null,
	path: ["title"],
	locale: "fr",
	value,
	source: {
		source: hashTranslationText({ format: "text", text: source }),
		origin: "ai",
		output: hashTranslationText({ format: "text", text: value }),
	},
});

const titleOf = async (documentId: number, versionId?: number) => {
	const read = await readDocumentContent(context, {
		collectionKey: collection.key,
		id: documentId,
		versionId,
	});
	assert(read.data, JSON.stringify(read.error));
	return read.data.stored.fields?.find((field) => field.key === "title");
};

test("translations go into an existing request's proposal as machine translations", async () => {
	const documentId = await savePage({ en: "Hello" });
	const requestId = await openRequest(documentId);

	const proposals = await getRequestProposals(context, {
		requestId,
		collectionKey: collection.key,
		documentIds: [documentId],
		user: editor,
	});
	assert(proposals.data, JSON.stringify(proposals.error));
	expect(proposals.data.locales).toBeNull();

	const saved = await saveTranslatedProposals(context, {
		collection,
		localization: localization(),
		proposals: proposals.data.proposals,
		changes: [frenchChange(documentId, "Hello", "Bonjour")],
		overwrite: false,
		user: editor,
	});
	expect(saved.error).toBeUndefined();

	const proposal = await titleOf(
		documentId,
		proposals.data.proposals[0]?.versionId,
	);
	expect(proposal?.translations?.fr).toBe("Bonjour");
	expect(proposal?.translationSources?.fr?.origin).toBe("ai");
	expect((await titleOf(documentId))?.translations?.fr).toBeFalsy();
});

test("only documents already in the request can be translated into it", async () => {
	const inRequest = await savePage({ en: "One" });
	const outside = await savePage({ en: "Two" });
	const requestId = await openRequest(inRequest);

	const proposals = await getRequestProposals(context, {
		requestId,
		collectionKey: collection.key,
		documentIds: [inRequest, outside],
		user: editor,
	});
	expect(proposals.error?.status).toBe(400);
});

test("a request limited to French doesn't take German translations", async () => {
	const documentId = await savePage({ en: "Hi" });
	const requestId = await openRequest(documentId, ["fr"]);

	const translated = await translateDocuments(context, {
		collectionKey: collection.key,
		documentIds: [documentId],
		targetLocales: ["de"],
		delivery: "request",
		requestId,
		user: editor,
	});
	expect(translated.error?.message).toEqual(
		expect.objectContaining({ key: "core.translations.locales.invalid" }),
	);
});

test("translations saved straight to latest keep their machine record", async () => {
	const documentId = await savePage({ en: "Welcome" });

	const saved = await saveTranslatedLatest(context, {
		collection,
		localization: localization(),
		documentIds: [documentId],
		changes: [frenchChange(documentId, "Welcome", "Bienvenue")],
		overwrite: false,
		user: editor,
	});
	expect(saved.data).toEqual({ documents: [documentId], failures: [] });

	const latest = await titleOf(documentId);
	expect(latest?.translations?.fr).toBe("Bienvenue");
	expect(latest?.translationSources?.fr?.origin).toBe("ai");
});

test("translations aren't saved over latest while someone has it open in an editor", async () => {
	const documentId = await savePage({ en: "Contact" });
	const holder = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: "holder@example.test",
			username: "holder",
			secret: "test",
			super_admin: true,
		})
		.returning(["id", "email", "username"])
		.executeTakeFirstOrThrow();
	const held = await heartbeat(context, {
		collectionKey: collection.key,
		documentId,
		requestId: null,
		tabId: "holder-tab",
		user: { ...holder, superAdmin: true, permissions: [] },
		takeOver: false,
	});
	expect(held.error).toBeUndefined();

	const saved = await saveTranslatedLatest(context, {
		collection,
		localization: localization(),
		documentIds: [documentId],
		changes: [frenchChange(documentId, "Contact", "Contact FR")],
		overwrite: false,
		user: editor,
		editorHolds: { userId: editor.id },
	});
	expect(saved.data?.documents).toEqual([]);
	expect(saved.data?.failures).toHaveLength(1);
	expect((await titleOf(documentId))?.translations?.fr).toBeFalsy();
});
