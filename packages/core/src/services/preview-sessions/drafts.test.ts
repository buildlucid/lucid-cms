import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, assert, beforeAll, describe, expect, test } from "vitest";
import z from "zod";
import applyCollectionMigrations from "../../libs/collection/apply-collection-migrations.js";
import BrickBuilder from "../../libs/collection/builders/brick-builder/index.js";
import CollectionBuilder from "../../libs/collection/builders/collection-builder/index.js";
import planCollectionMigrations from "../../libs/collection/plan-collection-migrations.js";
import type { LucidPreviewDraftContent } from "../../libs/db/tables/index.js";
import { createTranslationStore } from "../../libs/i18n/index.js";
import { getCollectionPermission } from "../../libs/permission/collection-permissions.js";
import createToolkit from "../../libs/toolkit/create-toolkit.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import type { LucidUser } from "../../types/hono.js";
import { hashPreviewToken } from "../../utils/helpers/index.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import readVersionContent from "../documents-versions/helpers/read-version-content.js";
import updateVersion from "../documents-versions/update-single.js";
import getContentDocuments from "../documents/content/get-multiple.js";
import getContentDocument from "../documents/content/get-single.js";
import syncCollections from "../sync/sync-collections.js";
import syncLocales from "../sync/sync-locales.js";
import updateDraft from "./update-draft.js";

const settings = new CollectionBuilder("settings", {
	mode: "multiple",
	details: { labels: { singular: "Setting", plural: "Settings" } },
}).addText("label");
const pages = new CollectionBuilder("pages", {
	mode: "multiple",
	localized: true,
	details: { labels: { singular: "Page", plural: "Pages" } },
	bricks: {
		builder: [new BrickBuilder("hero").addText("heading", { localized: true })],
		fixed: [new BrickBuilder("seo").addText("summary", { localized: false })],
	},
})
	.addText("title", { localized: true })
	.addText("subtitle", {
		localized: false,
		validation: { required: true, zod: z.string().min(5) },
	})
	.addText("notes", { localized: false, permissions: { read: true } })
	.addRelation("settings", { collection: "settings", localized: false })
	.addRepeater("links", { validation: { minGroups: 1 } })
	.addText("label", { localized: false })
	.endRepeater();

/** Content without the marks preview reads add, to compare it with published reads. */
const withoutMarks = (value: unknown): unknown =>
	JSON.parse(
		JSON.stringify(value, (key, item) =>
			key === "$preview" ? undefined : item,
		),
	);

/** Finds a field in draft input, failing the test when it is missing. */
const field = (fields: FieldInputSchema[] | undefined, key: string) => {
	const found = fields?.find((item) => item.key === key);
	assert(found, `missing field ${key}`);
	return found;
};

describe("preview drafts", () => {
	const fixture = getTestConfig();
	let context: ReturnType<typeof createServiceContext>;
	let user: LucidUser;
	/** Can edit pages, but can't read settings or the restricted notes field. */
	let editor: LucidUser;
	let pageId: number;
	let otherPageId: number;
	let otherSettingId: number;
	let versionId: number;
	let stored: LucidPreviewDraftContent;
	let revision = 0;

	/** Creates a builder preview session for the page. */
	const createSession = async (owner = user) => {
		const token = randomBytes(32).toString("base64url");
		await context.db.kysely
			.insertInto("lucid_preview_sessions")
			.values({
				token_hash: hashPreviewToken(token),
				entry_collection_key: "pages",
				entry_document_id: pageId,
				entry_version_type: "latest",
				mode: "navigable",
				expires_at: "2099-01-01T00:00:00.000Z",
				created_by: owner.id,
			})
			.execute();
		return token;
	};
	/** The stored content with a changed title, hero heading and repeater, plus an added link. */
	const editedContent = (title: string): LucidPreviewDraftContent => {
		const draft = structuredClone(stored);
		field(draft.fields, "title").translations = { en: title };
		const hero = draft.bricks.find((brick) => brick.key === "hero");
		field(hero?.fields, "heading").translations = { en: "Draft heading" };
		const links = field(draft.fields, "links");
		const [first] = links.groups ?? [];
		assert(first);
		field(first.fields, "label").value = "Draft link";
		links.groups = [
			first,
			{
				ref: randomUUID(),
				order: 1,
				fields: [{ key: "label", type: "text", value: "Added link" }],
			},
		];
		return draft;
	};
	const writeDraft = (
		token: string,
		draft: LucidPreviewDraftContent | null,
		overrides: { revision?: number; user?: LucidUser } = {},
	) =>
		updateDraft(context, {
			token,
			collectionKey: "pages",
			documentId: pageId,
			versionId,
			revision: overrides.revision ?? ++revision,
			draft,
			user: overrides.user ?? user,
		});
	const readPage = (preview?: string) =>
		getContentDocument(context, {
			collectionKey: "pages",
			versionType: "latest",
			preview,
			locale: "en",
			query: { filter: { id: { value: pageId } }, include: ["bricks"] },
		});
	const insertUser = async (
		superAdmin: boolean,
		permissions: LucidUser["permissions"] = [],
	): Promise<LucidUser> => {
		const row = await context.db.kysely
			.insertInto("lucid_users")
			.values({
				email: `${randomUUID()}@example.test`,
				username: randomUUID(),
				secret: "test",
				super_admin: superAdmin,
			})
			.returning(["id", "email", "username"])
			.executeTakeFirstOrThrow();
		return { ...row, superAdmin, permissions };
	};

	beforeAll(async () => {
		const config = await fixture.getConfig();
		context = createServiceContext({
			config: {
				...config,
				collections: [settings, pages],
				localization: {
					defaultLocale: "en",
					locales: [{ code: "en", label: "English" }],
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
		user = await insertUser(true);
		editor = await insertUser(false, [
			getCollectionPermission("pages", "read"),
			getCollectionPermission("pages", "update"),
		]);

		const toolkit = createToolkit(context);
		const setting = await toolkit.documents.createSingle({
			collectionKey: "settings",
			actor: { type: "system" },
			data: { fields: { label: "Footer" } },
		});
		assert(setting.data, JSON.stringify(setting.error));
		const page = await toolkit.documents.createSingle({
			collectionKey: "pages",
			actor: { type: "system" },
			data: {
				fields: {
					title: { en: "About" },
					subtitle: "Who we are",
					notes: "Secret",
					settings: [{ id: setting.data.id, collectionKey: "settings" }],
					links: [{ fields: { label: "Stored link" } }],
				},
				bricks: {
					builder: [{ key: "hero", fields: { heading: { en: "Hi" } } }],
					fixed: { seo: { summary: "Summary" } },
				},
			},
		});
		assert(page.data, JSON.stringify(page.error));
		pageId = page.data.id;
		const otherPage = await toolkit.documents.createSingle({
			collectionKey: "pages",
			actor: { type: "system" },
			data: {
				fields: {
					title: { en: "Contact" },
					subtitle: "Say hello",
					links: [{ fields: { label: "Email" } }],
				},
			},
		});
		assert(otherPage.data, JSON.stringify(otherPage.error));
		otherPageId = otherPage.data.id;
		const otherSetting = await toolkit.documents.createSingle({
			collectionKey: "settings",
			actor: { type: "system" },
			data: { fields: { label: "Sidebar" } },
		});
		assert(otherSetting.data, JSON.stringify(otherSetting.error));
		otherSettingId = otherSetting.data.id;

		const version = await readVersionContent(context, {
			collectionKey: "pages",
			documentId: pageId,
		});
		assert(version.data, JSON.stringify(version.error));
		versionId = version.data.id;
		stored = version.data.content;
	});
	afterAll(() => fixture.destroy());

	test("reads unsaved edits through the preview token as the same content reads once saved", async () => {
		const token = await createSession();
		const draft = editedContent("Draft about");
		expect((await writeDraft(token, draft)).error).toBeUndefined();

		const previewed = await readPage(token);
		assert(previewed.data, JSON.stringify(previewed.error));
		expect(previewed.data.fields).toMatchObject({
			title: "Draft about",
			settings: [{ collectionKey: "settings", fields: { label: "Footer" } }],
			links: [{ label: "Draft link" }, { label: "Added link" }],
		});
		const unchanged = await readPage();
		expect(unchanged.data?.fields.title).toBe("About");

		const saved = await updateVersion(context, {
			collectionKey: "pages",
			userId: user.id,
			authUser: user,
			documentId: pageId,
			versionId,
			...draft,
		});
		expect(saved.error).toBeUndefined();
		const read = await readPage();
		assert(read.data, JSON.stringify(read.error));

		//* brick IDs are regenerated by every save, and previews mark where things are, so only the content is compared
		const content = (document: typeof read.data) =>
			withoutMarks({
				fields: document.fields,
				bricks: document.bricks?.map(({ id: _id, ...brick }) => brick),
				fixed: Object.values(document.fixed ?? {}).map(
					({ id: _id, ...brick }) => brick,
				),
			});
		expect(content(previewed.data)).toEqual(content(read.data));

		expect(
			(
				await updateVersion(context, {
					collectionKey: "pages",
					userId: user.id,
					authUser: user,
					documentId: pageId,
					versionId,
					...stored,
				})
			).error,
		).toBeUndefined();
	});

	test("marks the document, its bricks and repeater items with where they are, for sites to point the preview at", async () => {
		const token = await createSession();
		const draft = editedContent("Marked draft");
		expect((await writeDraft(token, draft)).error).toBeUndefined();

		const previewed = await readPage(token);
		assert(previewed.data, JSON.stringify(previewed.error));
		const page = JSON.parse(JSON.stringify(previewed.data));
		const base = { collectionKey: "pages", documentId: pageId, locale: "en" };
		const hero = draft.bricks.find((brick) => brick.key === "hero");
		const added = field(draft.fields, "links").groups?.[1];
		assert(hero && added);

		expect(page.$preview).toEqual({ ...base, path: [] });
		expect(page.bricks[0].$preview).toEqual({
			...base,
			brick: { type: "builder", key: "hero", ref: hero.ref },
			path: [],
		});
		expect(page.fields.links[1].$preview).toEqual({
			...base,
			path: ["links", { ref: added.ref }],
		});
		expect(page.fields.settings[0].$preview).toMatchObject({
			collectionKey: "settings",
			path: [],
		});
		expect((await readPage()).data).not.toHaveProperty("$preview");
	});

	test("lists show the draft for the entry document only", async () => {
		const token = await createSession();
		expect(
			(await writeDraft(token, editedContent("Listed draft"))).error,
		).toBeUndefined();

		const listed = await getContentDocuments(context, {
			collectionKey: "pages",
			versionType: "latest",
			preview: token,
			locale: "en",
			query: {},
		});
		assert(listed.data, JSON.stringify(listed.error));
		const title = (id: number) =>
			listed.data?.documents.find((item) => item.id === id)?.fields.title;
		expect(title(pageId)).toBe("Listed draft");
		expect(title(otherPageId)).toBe("Contact");
	});

	test("keeps the newest revision, clears on null and only lets the session's creator write", async () => {
		const token = await createSession();
		expect(
			(await writeDraft(token, editedContent("Newest"), { revision: 10 }))
				.error,
		).toBeUndefined();
		expect(
			(await writeDraft(token, editedContent("Older"), { revision: 9 })).error,
		).toBeUndefined();
		expect((await readPage(token)).data?.fields.title).toBe("Newest");

		const other = await writeDraft(token, editedContent("Someone else"), {
			revision: 11,
			user: await insertUser(true),
		});
		expect(other.error?.code).toBe("preview_invalid");

		expect(
			(await writeDraft(token, null, { revision: 12 })).error,
		).toBeUndefined();
		expect((await readPage(token)).data?.fields.title).toBe("About");
	});

	test("a save made after the draft hides it", async () => {
		const token = await createSession();
		expect(
			(await writeDraft(token, editedContent("Stale draft"))).error,
		).toBeUndefined();

		const saved = editedContent("Saved later");
		const save = (content: LucidPreviewDraftContent) =>
			updateVersion(context, {
				collectionKey: "pages",
				userId: user.id,
				authUser: user,
				documentId: pageId,
				versionId,
				...content,
			});
		expect((await save(saved)).error).toBeUndefined();
		expect((await readPage(token)).data?.fields.title).toBe("Saved later");
		expect((await save(stored)).error).toBeUndefined();
	});

	test("restricted fields keep their stored content and new links need read access", async () => {
		const token = await createSession(editor);
		const draft = editedContent("Editor draft");
		draft.fields = draft.fields.filter((item) => item.key !== "notes");
		expect(
			(await writeDraft(token, draft, { user: editor })).error,
		).toBeUndefined();
		const previewed = await readPage(token);
		expect(previewed.data?.fields).toMatchObject({
			title: "Editor draft",
			notes: "Secret",
		});

		field(draft.fields, "settings").value = [
			{ id: otherSettingId, collectionKey: "settings" },
		];
		const unreadable = await writeDraft(token, draft, { user: editor });
		expect(unreadable.error?.status).toBe(400);
		expect((await readPage(token)).data?.fields.title).toBe("Editor draft");
	});

	test("drafts pass a save's validation, allowing unfinished content", async () => {
		const token = await createSession();
		const unfinished = editedContent("Unfinished");
		field(unfinished.fields, "subtitle").value = "Hi";
		field(unfinished.fields, "links").groups = [];
		expect((await writeDraft(token, unfinished)).error).toBeUndefined();
		expect((await readPage(token)).data?.fields).toMatchObject({
			title: "Unfinished",
			subtitle: "Hi",
			links: [],
		});

		const mistyped = editedContent("Mistyped");
		field(mistyped.fields, "subtitle").type = "json";
		expect((await writeDraft(token, mistyped)).error?.status).toBe(400);
		expect((await readPage(token)).data?.fields.title).toBe("Unfinished");
	});
});
