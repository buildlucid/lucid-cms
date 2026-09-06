import { afterAll, assert, beforeAll, describe, expect, test } from "vitest";
import checkFullSlugUniqueness from "../../../../plugin-pages/src/services/checks/fullslug-uniqueness.js";
import getPageDescendants from "../../../../plugin-pages/src/services/get-descendant-fields.js";
import getPageFields from "../../../../plugin-pages/src/services/get-document-version-fields.js";
import getStoredRouteSegmentSelections from "../../../../plugin-pages/src/services/get-stored-route-segment-selections.js";
import fetchRouteSegmentValues from "../../../../plugin-pages/src/services/helpers/fetch-route-segment-values.js";
import updateFullSlugFields from "../../../../plugin-pages/src/services/update-fullslug-fields.js";
import type { CollectionConfig } from "../../../../plugin-pages/src/types/types.js";
import applyCollectionMigrations from "../../libs/collection/apply-collection-migrations.js";
import CollectionBuilder from "../../libs/collection/builders/collection-builder/index.js";
import getCurrentCollectionMigrationId from "../../libs/collection/migration/get-current-collection-migration-id.js";
import planCollectionMigrations from "../../libs/collection/plan-collection-migrations.js";
import {
	getBricksTableSchema,
	getTableNames,
} from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import documentBricksFormatter from "../../libs/formatters/document-bricks.js";
import documentFieldsFormatter from "../../libs/formatters/document-fields.js";
import { createTranslationStore } from "../../libs/i18n/index.js";
import {
	DocumentBricksRepository,
	DocumentsRepository,
	DocumentVersionsRepository,
	MediaRepository,
	MediaTranslationsRepository,
	UsersRepository,
} from "../../libs/repositories/index.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import createDocumentBricks from "../documents-bricks/create-multiple.js";
import cloneVersion from "../documents-versions/clone-version.js";
import getMedia from "../media/get-single.js";
import prepareMediaTranslations from "../media/helpers/prepare-media-translations.js";
import updateMedia from "../media/update-single.js";
import createRole from "../roles/create-single.js";
import updateRole from "../roles/update-single.js";
import syncCollections from "../sync/sync-collections.js";
import syncLocales from "../sync/sync-locales.js";
import updateVersion from "./update-single.js";

const collection = new CollectionBuilder("locale_adoption", {
	mode: "multiple",
	localized: true,
	details: { labels: { singular: "Article", plural: "Articles" } },
})
	.addText("title", { localized: true })
	.addText("reference", { localized: false })
	.addRepeater("items")
	.addText("caption", { localized: true })
	.endRepeater()
	.addUser("authors", { localized: true, multiple: true })
	.addText("slug", { localized: true })
	.addText("fullSlug", { localized: true })
	.addRelation("parentPage", {
		collection: "locale_adoption",
		localized: false,
	});

describe("unassigned content locales", () => {
	const fixture = getTestConfig();
	let context: ServiceContext;
	let userId: number;
	beforeAll(async () => {
		const config = await fixture.getConfig();
		context = createServiceContext({
			config: { ...config, collections: [collection] },
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
		const user = await new UsersRepository(context.db).createSingle({
			data: {
				email: "locale@example.com",
				username: "locale",
				secret: "test-secret",
			},
			returning: ["id"],
			validation: { enabled: true },
		});
		assert(user.data, JSON.stringify(user.error));
		userId = user.data.id;
	});
	afterAll(() => fixture.destroy());

	test("resolves untouched versions using the current default and assigns saved content", async () => {
		expect(context.config.localization).toMatchObject({
			locales: [],
			defaultLocale: null,
		});
		const names = await getTableNames(context, collection.key);
		assert(names.data);
		const schema = await getBricksTableSchema(context, collection.key);
		assert(schema.data);
		const bricksSchema = schema.data;
		const tableNames = names.data;
		const migration = await getCurrentCollectionMigrationId(
			context,
			collection.key,
		);
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
		assert(document.data, JSON.stringify(document.error));
		const versionIds: number[] = [];
		for (const type of ["latest", "published", "revision"]) {
			const version = await new DocumentVersionsRepository(
				context.db,
			).createSingle(
				{
					data: {
						collection_key: collection.key,
						collection_migration_id: migration.data,
						document_id: document.data.id,
						type,
						content_id: `content-${type}`,
						created_by: userId,
						updated_by: userId,
					},
					returning: ["id"],
					validation: { enabled: true },
				},
				{ tableName: names.data.version },
			);
			assert(version.data, JSON.stringify(version.error));
			versionIds.push(version.data.id);
			const saved = await createDocumentBricks(context, {
				collection,
				documentId: document.data.id,
				versionId: version.data.id,
				fields: [
					{ key: "title", type: "text", value: "Hallo" },
					{ key: "reference", type: "text", value: "shared" },
					{
						key: "items",
						type: "repeater",
						groups: [
							{
								ref: "item",
								order: 0,
								fields: [{ key: "caption", type: "text", value: "Guten Tag" }],
							},
						],
					},
					{ key: "authors", type: "user", value: [userId] },
				],
			});
			expect(saved.error).toBeUndefined();
		}
		const readFields = async (versionId: number) => {
			const rows = await new DocumentBricksRepository(
				context.db,
			).selectMultipleByVersionId(
				{ versionId, bricksSchema: bricksSchema },
				{ tableName: tableNames.version },
			);
			assert(rows.data, JSON.stringify(rows.error));
			return documentFieldsFormatter.flattenFields(
				documentBricksFormatter.formatDocumentFields({
					bricksQuery: rows.data,
					collection,
					bricksSchema: bricksSchema,
					config: context.config,
					host: "http://localhost",
				}),
			);
		};
		assert(versionIds[0]);
		expect(await readFields(versionIds[0])).toMatchObject({
			title: "Hallo",
			reference: "shared",
			items: [{ caption: "Guten Tag" }],
			authors: [userId],
		});
		context.config.localization = {
			defaultLocale: "de",
			locales: [
				{ code: "de", label: "German" },
				{ code: "fr", label: "French" },
			],
		};
		expect((await syncLocales(context)).error).toBeUndefined();
		expect((await readFields(versionIds[0])).title).toEqual({
			de: "Hallo",
			fr: null,
		});
		context.config.localization.defaultLocale = "fr";
		for (const id of versionIds) {
			expect(await readFields(id)).toMatchObject({
				title: { de: null, fr: "Hallo" },
				reference: "shared",
				items: [{ caption: { de: null, fr: "Guten Tag" } }],
				authors: { de: [], fr: [userId] },
			});
		}
		const clone = await cloneVersion(context, {
			collectionKey: collection.key,
			documentId: document.data.id,
			fromVersionId: versionIds[0],
			toVersionType: "snapshot",
			userId,
		});
		assert(clone.data, JSON.stringify(clone.error));
		expect(await readFields(clone.data.versionId)).toMatchObject({
			title: { fr: "Hallo" },
			reference: "shared",
			items: [{ caption: { fr: "Guten Tag" } }],
			authors: { fr: [userId] },
		});
		context.config.localization.defaultLocale = "de";
		expect((await readFields(clone.data.versionId)).title).toEqual({
			de: "",
			fr: "Hallo",
		});
		// An explicit empty row must override the inherited source, including relations.
		const latest = versionIds[0];
		const original = await context.db.kysely
			.selectFrom(names.data.documentFields)
			.selectAll()
			.where("document_version_id", "=", latest)
			.executeTakeFirstOrThrow();
		const { id: _id, ...row } = original;
		await context.db.kysely
			.insertInto(names.data.documentFields)
			.values({ ...row, locale: "de", _title: null })
			.execute();
		expect(await readFields(latest)).toMatchObject({
			title: { de: "", fr: null },
			authors: { de: [], fr: [] },
		});
		const saved = await updateVersion(context, {
			collectionKey: collection.key,
			documentId: document.data.id,
			versionId: latest,
			userId,
			fields: [
				{ key: "title", type: "text", translations: { de: "Gespeichert" } },
				{ key: "reference", type: "text", value: "shared" },
			],
		});
		expect(saved.error).toBeUndefined();
		context.config.localization.defaultLocale = "fr";
		expect((await readFields(latest)).title).toEqual({
			de: "Gespeichert",
			fr: "",
		});
		for (const historical of versionIds.slice(1)) {
			expect((await readFields(historical)).title).toEqual({
				de: null,
				fr: "Hallo",
			});
		}
	});

	test("upserts a single unassigned media row and adopts it without changing its language later", async () => {
		const media = await new MediaRepository(context.db).createSingle({
			data: {
				key: "unassigned-image",
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
		assert(media.data, JSON.stringify(media.error));
		const translations = new MediaTranslationsRepository(context.db);
		for (const title of ["First", "Zweite"]) {
			const result = await translations.upsertSingle({
				data: {
					media_id: media.data.id,
					locale_code: null,
					title,
					alt: "Bild",
				},
			});
			expect(result.error).toBeUndefined();
		}
		context.config.localization.defaultLocale = null;
		const unassigned = await getMedia(context, { id: media.data.id });
		assert(unassigned.data, JSON.stringify(unassigned.error));
		expect(unassigned.data.title).toBe("Zweite");

		context.config.localization.locales = [
			{ code: "de", label: "German" },
			{ code: "fr", label: "French" },
		];
		context.config.localization.defaultLocale = "de";
		const inherited = await getMedia(context, { id: media.data.id });
		assert(inherited.data, JSON.stringify(inherited.error));
		expect(inherited.data.title).toEqual({ de: "Zweite" });

		context.config.localization.defaultLocale = "fr";
		const french = await getMedia(context, { id: media.data.id });
		expect(french.data?.title).toEqual({ fr: "Zweite" });
		context.config.localization.defaultLocale = "de";
		expect(
			(await updateMedia(context, { id: media.data.id, userId })).error,
		).toBeUndefined();
		context.config.localization.defaultLocale = "fr";
		expect(
			(await getMedia(context, { id: media.data.id })).data?.title,
		).toEqual({ de: "Zweite" });
		context.config.localization.defaultLocale = "de";

		const rows = await context.db.kysely
			.selectFrom("lucid_media_translations")
			.selectAll()
			.where("media_id", "=", media.data.id)
			.execute();
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			locale_code: "de",
			title: "Zweite",
			alt: "Bild",
		});

		const configured = context.config.localization;
		context.config.localization = {
			defaultLocale: "fr",
			locales: [{ code: "fr", label: "French" }],
		};
		expect(
			(await getMedia(context, { id: media.data.id })).data?.title,
		).toEqual({});
		context.config.localization = { defaultLocale: null, locales: [] };
		expect(
			(await getMedia(context, { id: media.data.id })).data?.title,
		).toBeNull();
		context.config.localization = configured;
		expect(
			(await getMedia(context, { id: media.data.id })).data?.title,
		).toEqual({ de: "Zweite" });

		// A cleared default value must not resurrect the unassigned text.
		const clearedResults = await Promise.all([
			translations.upsertSingle({
				data: {
					media_id: media.data.id,
					locale_code: "de",
					title: null,
					alt: null,
				},
			}),
			translations.upsertSingle({
				data: {
					media_id: media.data.id,
					locale_code: null,
					title: "Fallback",
					alt: "Fallback",
				},
			}),
		]);
		for (const result of clearedResults) expect(result.error).toBeUndefined();
		const explicit = await getMedia(context, { id: media.data.id });
		assert(explicit.data, JSON.stringify(explicit.error));
		expect(explicit.data.title).toEqual({ de: null });
		expect(
			(
				await translations.adoptUnassigned({
					localeCode: "de",
					mediaId: media.data.id,
				})
			).error,
		).toBeUndefined();
		const rectified = await context.db.kysely
			.selectFrom("lucid_media_translations")
			.select(["locale_code", "title"])
			.where("media_id", "=", media.data.id)
			.execute();
		expect(rectified).toEqual([{ locale_code: "de", title: null }]);
	});

	test("keeps page routes and parent relations usable as the default changes without assigning stored rows", async () => {
		const pages: CollectionConfig = {
			key: collection.key,
			localized: true,
			segments: [],
			unique: true,
			ui: {
				fullSlug: true,
				placement: { at: "end" },
				widths: { slug: 12, fullSlug: 12, parentPage: 12, segments: 12 },
			},
		};
		const namesRes = await getTableNames(context, collection.key);
		assert(namesRes.data);
		const tables = namesRes.data;
		const migration = await getCurrentCollectionMigrationId(
			context,
			collection.key,
		);
		assert(migration.data);
		context.config.localization = { locales: [], defaultLocale: null };
		const documents: { documentId: number; versionId: number }[] = [];
		for (const slug of ["parent", "child"]) {
			const doc = await new DocumentsRepository(context.db).createSingle(
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
				{ tableName: tables.document },
			);
			assert(doc.data);
			const version = await new DocumentVersionsRepository(
				context.db,
			).createSingle(
				{
					data: {
						collection_key: collection.key,
						collection_migration_id: migration.data,
						document_id: doc.data.id,
						type: "latest",
						content_id: slug,
						created_by: userId,
						updated_by: userId,
					},
					returning: ["id"],
					validation: { enabled: true },
				},
				{ tableName: tables.version },
			);
			assert(version.data);
			const saved = await createDocumentBricks(context, {
				collection,
				documentId: doc.data.id,
				versionId: version.data.id,
				fields: [
					{ key: "slug", type: "text", value: slug },
					{ key: "fullSlug", type: "text", value: `/${slug}` },
					{
						key: "parentPage",
						type: "relation",
						value: documents[0]
							? [{ id: documents[0].documentId, collectionKey: collection.key }]
							: [],
					},
				],
			});
			expect(saved.error).toBeUndefined();
			documents.push({ documentId: doc.data.id, versionId: version.data.id });
		}
		const [parent, child] = documents;
		assert(parent);
		assert(child);
		const collision = (locale: string | null, path: string) =>
			checkFullSlugUniqueness(context, {
				collection: pages,
				collectionKey: collection.key,
				versionType: "latest",
				tables,
				projectedFullSlugs: [
					{
						documentId: 999,
						versionId: 999,
						fullSlugs: new Map([[locale, path]]),
					},
				],
			});
		expect((await collision(null, "/parent")).error?.status).toBe(400);
		context.config.localization = {
			defaultLocale: "de",
			locales: [
				{ code: "de", label: "German" },
				{ code: "fr", label: "French" },
			],
		};
		const fields = await getPageFields(context, {
			...child,
			collectionKey: collection.key,
			versionType: "latest",
			tables,
		});
		expect(fields.error).toBeUndefined();
		expect(fields.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					locale: "de",
					_parentPage: parent.documentId,
					_slug: "child",
				}),
			]),
		);
		const selections = await getStoredRouteSegmentSelections(context, {
			collection: {
				...pages,
				segments: [
					{ relation: "parentPage", collection: collection.key, field: "slug" },
				],
			},
			sources: [{ sourceKey: "child", versionId: child.versionId }],
		});
		expect(selections.error).toBeUndefined();
		expect(selections.data).toEqual([
			{
				sourceKey: "child",
				index: 0,
				collectionKey: collection.key,
				documentId: parent.documentId,
			},
		]);
		const descendants = await getPageDescendants(context, {
			ids: [parent.documentId],
			collectionKey: collection.key,
			versionType: "latest",
			tables,
		});
		expect(descendants.error).toBeUndefined();
		expect(descendants.data?.[0]?.document_id).toBe(child.documentId);
		expect((await collision("de", "/parent")).error?.status).toBe(400);
		expect((await collision("fr", "/parent")).error).toBeUndefined();
		const values = await fetchRouteSegmentValues(context, {
			collection: pages,
			versionType: "latest",
			locales: ["de"],
			targets: [
				{
					sourceKey: "current",
					index: 0,
					collectionKey: collection.key,
					documentId: parent.documentId,
					field: "slug",
					localized: true,
					storageLocale: null,
				},
			],
		});
		expect(values.error).toBeUndefined();
		expect([...(values.data?.values() ?? [])]).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ segment_0: "parent" }),
			]),
		);
		expect(
			(
				await updateFullSlugFields(context, {
					collectionKey: collection.key,
					versionType: "latest",
					tables,
					docFullSlugs: [
						{ ...child, fullSlugs: new Map([["de", "/parent/child"]]) },
					],
				})
			).error,
		).toBeUndefined();
		expect((await collision("de", "/parent/child")).error?.status).toBe(400);
	});

	test("promotes unassigned media input while preserving an explicitly cleared default translation", () => {
		expect(
			prepareMediaTranslations({
				mediaId: 1,
				defaultLocale: "de",
				title: [
					{ localeCode: null, value: "Hallo" },
					{ localeCode: "de", value: null },
				],
				alt: [{ localeCode: null, value: "Bild" }],
			}),
		).toEqual([
			{
				media_id: 1,
				locale_code: "de",
				title: null,
				alt: "Bild",
				description: null,
				summary: null,
			},
		]);
	});

	test("creates and updates permission roles with plain names and descriptions", async () => {
		const role = await createRole(context, {
			name: "Redakteur",
			description: "Inhalte bearbeiten",
			permissions: ["documents:locale_adoption:read"],
		});
		assert(role.data, JSON.stringify(role.error));
		expect(
			(await createRole(context, { name: "Redakteur", permissions: [] })).error
				?.status,
		).toBe(400);
		expect(
			(
				await updateRole(context, {
					id: role.data,
					name: "Editor",
					description: null,
				})
			).error,
		).toBeUndefined();
		expect(
			await context.db.kysely
				.selectFrom("lucid_roles")
				.select(["name", "description"])
				.where("id", "=", role.data)
				.executeTakeFirst(),
		).toEqual({ name: "Editor", description: null });
		expect(
			await context.db.kysely
				.selectFrom("lucid_role_permissions")
				.select("permission")
				.where("role_id", "=", role.data)
				.execute(),
		).toEqual([{ permission: "documents:locale_adoption:read" }]);
	});
});
