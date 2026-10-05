import { afterAll, assert, beforeAll, expect, test } from "vitest";
import applyCollectionMigrations from "../../libs/collection/apply-collection-migrations.js";
import BrickBuilder from "../../libs/collection/builders/brick-builder/index.js";
import CollectionBuilder from "../../libs/collection/builders/collection-builder/index.js";
import planCollectionMigrations from "../../libs/collection/plan-collection-migrations.js";
import { createTranslationStore } from "../../libs/i18n/index.js";
import type { BrickInputSchema } from "../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import withTransaction from "../../utils/services/with-transaction.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import upsertSingle from "../documents/upsert-single.js";
import cloneVersion from "../documents-versions/clone-version.js";
import readVersionContent from "../documents-versions/helpers/read-version-content.js";
import syncCollections from "../sync/sync-collections.js";
import syncLocales from "../sync/sync-locales.js";

const fixture = getTestConfig();
const brick = new BrickBuilder("nested")
	.addText("heading", { localized: false })
	.addRepeater("items")
	.addText("title", { localized: true })
	.addRepeater("children")
	.addText("childTitle", { localized: true })
	.endRepeater()
	.endRepeater();
const collection = new CollectionBuilder("batched_content", {
	mode: "multiple",
	localized: true,
	details: { labels: { singular: "Page", plural: "Pages" } },
	bricks: { builder: [brick] },
}).addText("title", { localized: true });
let context: ServiceContext;
let userId: number;

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
				],
				defaultLocale: "en",
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
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: "batches@example.test",
			username: "batches",
			secret: "test",
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	userId = user.id;
});
afterAll(() => fixture.destroy());

const content = {
	fields: [
		{ key: "title", type: "text", translations: { en: "Page", fr: "Page FR" } },
	],
	bricks: Array.from(
		{ length: 100 },
		(_, index): BrickInputSchema => ({
			key: brick.key,
			type: "builder",
			ref: `brick-${index}`,
			order: index,
			open: index % 2 === 0,
			fields: [
				{
					key: "heading",
					type: "text",
					value: `${index}:${"x".repeat(4_096)}`,
				},
				{
					key: "items",
					type: "repeater",
					groups: Array.from({ length: 5 }, (_, group) => ({
						ref: `item-${index}-${group}`,
						order: group,
						open: group % 2 === 0,
						fields: [
							{
								key: "title",
								type: "text",
								translations: {
									en: `${index}-${group}`,
									fr: `FR-${index}-${group}`,
								},
							},
							{
								key: "children",
								type: "repeater",
								groups: Array.from({ length: 3 }, (_, child) => ({
									ref: `child-${index}-${group}-${child}`,
									order: child,
									open: child % 2 === 0,
									fields: [
										{
											key: "childTitle",
											type: "text",
											translations: {
												en: `${index}-${group}-${child}`,
												fr: `FR-${index}-${group}-${child}`,
											},
										},
									],
								})),
							},
						],
					})),
				},
			],
		}),
	),
} satisfies { bricks: BrickInputSchema[]; fields: FieldInputSchema[] };

test("large localized content survives parameter-bounded inserts and version copies", async () => {
	const saved = await upsertSingle(context, {
		...content,
		collectionKey: collection.key,
		userId,
	});
	assert(saved.data, JSON.stringify(saved.error));
	const documentId = saved.data;
	const source = await readVersionContent(context, {
		collectionKey: collection.key,
		documentId,
		versionType: "latest",
	});
	assert(source.data, JSON.stringify(source.error));
	expect(source.data.content).toEqual(content);
	const fromVersionId = source.data.id;
	const copied = await withTransaction(context, (transaction) =>
		cloneVersion(transaction, {
			collectionKey: collection.key,
			documentId,
			fromVersionId,
			toVersionType: "proposal",
			userId,
		}),
	);
	assert(copied.data, JSON.stringify(copied.error));
	const destination = await readVersionContent(context, {
		collectionKey: collection.key,
		documentId,
		versionId: copied.data.versionId,
	});
	assert(destination.data, JSON.stringify(destination.error));
	expect(destination.data.content).toEqual(content);

	let rolledBackVersionId: number | undefined;
	const rolledBack = await withTransaction(context, async (transaction) => {
		const copy = await cloneVersion(transaction, {
			collectionKey: collection.key,
			documentId,
			fromVersionId,
			toVersionType: "snapshot",
			userId,
		});
		assert(copy.data, JSON.stringify(copy.error));
		rolledBackVersionId = copy.data.versionId;
		return {
			error: {
				status: 409,
				message: { type: "lucid.literal", value: "Roll back copied content" },
			},
			data: undefined,
		};
	});
	expect(rolledBack.error?.status).toBe(409);
	assert(rolledBackVersionId);
	const removed = await readVersionContent(context, {
		collectionKey: collection.key,
		documentId,
		versionId: rolledBackVersionId,
	});
	expect(removed.data).toBeNull();
});
