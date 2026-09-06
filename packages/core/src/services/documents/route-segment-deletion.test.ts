import {
	afterAll,
	assert,
	beforeAll,
	describe,
	expect,
	test,
	vi,
} from "vitest";
import beforeDeleteHandler from "../../../../plugin-pages/src/services/hooks/before-delete-handler.js";
import registerFields from "../../../../plugin-pages/src/services/register-fields.js";
import type { CollectionConfig } from "../../../../plugin-pages/src/types/types.js";
import type { FieldInputSchema } from "../../exports/types.js";
import applyCollectionMigrations from "../../libs/collection/apply-collection-migrations.js";
import CollectionBuilder from "../../libs/collection/builders/collection-builder/index.js";
import getCurrentCollectionMigrationId from "../../libs/collection/migration/get-current-collection-migration-id.js";
import planCollectionMigrations from "../../libs/collection/plan-collection-migrations.js";
import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { createTranslationStore } from "../../libs/i18n/index.js";
import {
	DocumentsRepository,
	DocumentVersionsRepository,
	UsersRepository,
} from "../../libs/repositories/index.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import createDocumentBricks from "../documents-bricks/create-multiple.js";
import syncCollections from "../sync/sync-collections.js";
import syncLocales from "../sync/sync-locales.js";
import deleteMultiple from "./delete-multiple.js";

// Use the same core runtime as the database fixture.
vi.mock(
	"@lucidcms/core/extension",
	async () => import("../../exports/extension.js"),
);

const groups = new CollectionBuilder("segment_groups", {
	mode: "multiple",
	details: { labels: { singular: "Entry", plural: "Entries" } },
	localized: true,
}).addText("key");
const pages = new CollectionBuilder("segment_pages", {
	mode: "multiple",
	details: { labels: { singular: "Entry", plural: "Entries" } },
	localized: true,
});
const pageConfig: CollectionConfig = {
	key: pages.key,
	localized: true,
	prefix: "/docs",
	unique: true,
	segments: [
		{ relation: "group", collection: groups.key, field: "key" },
		{ relation: "section", collection: groups.key, field: "key" },
	],
	ui: {
		fullSlug: true,
		placement: { at: "end" },
		widths: { fullSlug: 6, slug: 6, parentPage: 12, segments: 12 },
	},
};
registerFields(pages, pageConfig);

describe("route-segment soft deletion", () => {
	const fixture = getTestConfig();
	let context: ServiceContext;
	let userId: number;
	beforeAll(async () => {
		const config = await fixture.getConfig();
		context = createServiceContext({
			config: {
				...config,
				collections: [groups, pages],
				hooks: [
					{
						service: "documents",
						event: "beforeDelete",
						handler: beforeDeleteHandler({ collections: [pageConfig] }),
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
		context.config.localization = {
			defaultLocale: "en",
			locales: [{ code: "en", label: "English" }],
		};
		expect((await syncLocales(context)).error).toBeUndefined();
		expect((await syncCollections(context)).error).toBeUndefined();
		const plan = await planCollectionMigrations(context);
		assert(plan.data);
		expect(
			(await applyCollectionMigrations(context, plan.data)).error,
		).toBeUndefined();
		const user = await new UsersRepository(context.db).createSingle({
			data: {
				email: "segments@example.com",
				username: "segments",
				secret: "test",
			},
			returning: ["id"],
			validation: { enabled: true },
		});
		assert(user.data);
		userId = user.data.id;
	});
	afterAll(() => fixture.destroy());

	const create = async (
		collection: CollectionBuilder,
		fields: FieldInputSchema[],
	) => {
		const names = await getTableNames(context, collection.key);
		const migration = await getCurrentCollectionMigrationId(
			context,
			collection.key,
		);
		assert(names.data);
		assert(migration.data);
		const document = await new DocumentsRepository(context.db).createSingle(
			{
				data: {
					collection_key: collection.key,
					collection_migration_id: migration.data,
					created_by: userId,
					updated_by: userId,
				},
				returning: ["id"],
				validation: { enabled: true },
			},
			{ tableName: names.data.document },
		);
		assert(document.data);
		const version = await new DocumentVersionsRepository(
			context.db,
		).createSingle(
			{
				data: {
					collection_key: collection.key,
					collection_migration_id: migration.data,
					document_id: document.data.id,
					type: "latest",
					content_id: `segment-${collection.key}-${document.data.id}`,
					created_by: userId,
					updated_by: userId,
				},
				returning: ["id"],
				validation: { enabled: true },
			},
			{ tableName: names.data.version },
		);
		assert(version.data);
		expect(
			(
				await createDocumentBricks(context, {
					collection,
					documentId: document.data.id,
					versionId: version.data.id,
					fields,
					bricks: [],
					skipValidation: true,
				})
			).error,
		).toBeUndefined();
		return document.data.id;
	};

	test.each([
		false,
		true,
	])("removes only deleted segments and preserves the page hierarchy, localized=%s", async (localized) => {
		context.config.localization = localized
			? { defaultLocale: "en", locales: [{ code: "en", label: "English" }] }
			: { defaultLocale: null, locales: [] };
		const text = (key: string, value: string): FieldInputSchema => ({
			key,
			type: "text",
			...(localized ? { translations: { en: value } } : { value }),
		});
		const group = await create(groups, [text("key", "group")]);
		const section = await create(groups, [text("key", "section")]);
		const relations: FieldInputSchema[] = [
			{
				key: "group",
				type: "relation",
				value: [{ id: group, collectionKey: groups.key }],
			},
			{
				key: "section",
				type: "relation",
				value: [{ id: section, collectionKey: groups.key }],
			},
		];
		const slug = localized ? "translated" : "unassigned";
		const parent = await create(pages, [
			text("slug", slug),
			text("fullSlug", `/docs/group/section/${slug}`),
			...relations,
		]);
		const child = await create(pages, [
			text("slug", "child"),
			text("fullSlug", `/docs/group/section/${slug}/child`),
			...relations,
			{
				key: "parentPage",
				type: "relation",
				value: [{ id: parent, collectionKey: pages.key }],
			},
		]);
		const names = await getTableNames(context, pages.key);
		assert(names.data);
		const routes = async () =>
			context.db.kysely
				.selectFrom(names.data.documentFields)
				.select(["document_id", "_fullSlug"])
				.where("document_id", "in", [parent, child])
				.where("locale", localized ? "=" : "is", localized ? "en" : null)
				.orderBy("document_id")
				.execute();
		expect(
			(
				await deleteMultiple(context, {
					ids: [group],
					collectionKey: groups.key,
					userId,
				})
			).error,
		).toBeUndefined();
		expect(await routes()).toEqual([
			{ document_id: parent, _fullSlug: `/docs/section/${slug}` },
			{ document_id: child, _fullSlug: `/docs/section/${slug}/child` },
		]);
		// The first cleared relation must not prevent removing the remaining segment.
		expect(
			(
				await deleteMultiple(context, {
					ids: [section],
					collectionKey: groups.key,
					userId,
				})
			).error,
		).toBeUndefined();
		expect(await routes()).toEqual([
			{ document_id: parent, _fullSlug: `/docs/${slug}` },
			{ document_id: child, _fullSlug: `/docs/${slug}/child` },
		]);
		const conflictingGroup = await create(groups, [text("key", "conflict")]);
		const conflictingPage = await create(pages, [
			text("slug", slug),
			text("fullSlug", `/docs/conflict/${slug}`),
			{
				key: "group",
				type: "relation",
				value: [{ id: conflictingGroup, collectionKey: groups.key }],
			},
		]);
		const rejected = await deleteMultiple(context, {
			ids: [conflictingGroup],
			collectionKey: groups.key,
			userId,
		});
		expect(rejected.error?.status).toBe(400);
		const unchanged = await context.db.kysely
			.selectFrom(names.data.documentFields)
			.select("_fullSlug")
			.where("document_id", "=", conflictingPage)
			.where("locale", localized ? "=" : "is", localized ? "en" : null)
			.executeTakeFirst();
		expect(unchanged?._fullSlug).toBe(`/docs/conflict/${slug}`);
	});
});
