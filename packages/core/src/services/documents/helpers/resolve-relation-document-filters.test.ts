import { SQLiteAdapter } from "@lucidcms/sqlite";
import { afterAll, describe, expect, test } from "vitest";
import defineBrick from "../../../libs/collection/define-brick.js";
import defineCollection from "../../../libs/collection/define-collection.js";
import field from "../../../libs/collection/definitions/fields/field.js";
import inferSchema from "../../../libs/collection/schema/infer-schema.js";
import type { CollectionSchemaTable } from "../../../libs/collection/schema/types.js";
import type { LucidBrickTableName } from "../../../libs/db/tables/index.js";
import { copy } from "../../../libs/i18n/index.js";
import { groupRelationDocumentFilterConditions } from "./resolve-relation-document-filters.js";

describe("relation document filter grouping", async () => {
	const db = new SQLiteAdapter({ database: ":memory:" });
	const connection = await db.connect();

	afterAll(() => connection.destroy());

	const HeroBrick = defineBrick({
		key: "hero",
		fields: [
			field.relation("featured", {
				collection: "pages",
			}),
		],
	});
	const Articles = defineCollection({
		key: "articles",
		mode: "multiple",
		details: {
			labels: {
				singular: copy("admin:tests.collections.articles.singularName", {
					defaultMessage: "Article",
				}),
				plural: copy("admin:tests.collections.articles.name", {
					defaultMessage: "Articles",
				}),
			},
		},
		bricks: { builder: [HeroBrick] },
		fields: [
			field.relation("author", { collection: ["people", "teams"] }),
			field.repeater("cards", {
				fields: [field.relation("cta", { collection: "pages" })],
			}),
		],
	});
	const schema = inferSchema(Articles, db).data?.tables.filter(
		(table) => table.type !== "document" && table.type !== "versions",
	) as CollectionSchemaTable<LucidBrickTableName>[];

	test("supports explicit targets and defaults implicit traversals to the first collection", () => {
		const grouped = groupRelationDocumentFilterConditions({
			collection: Articles,
			bricksTableSchema: schema,
			conditions: [
				{ key: "fields.author.people.fields.first_name", value: "Will" },
				{ key: "fields.author.fields.last_name", value: "Yallop" },
				{ key: "fields.author.teams.fields.name", value: "Core" },
				{ key: "bricks.hero.featured.fields.slug", value: "home" },
				{ key: "fields.cta.pages.fields.slug", value: "contact" },
				{ key: "fields.author", value: "people:1" },
			],
		});

		expect(grouped).toHaveLength(4);
		expect(
			grouped.find((group) => group.targetCollectionKey === "people")
				?.conditions,
		).toEqual([
			{ key: "fields.first_name", value: "Will" },
			{ key: "fields.last_name", value: "Yallop" },
		]);
		expect(
			grouped.find((group) => group.targetCollectionKey === "teams")
				?.conditions,
		).toEqual([{ key: "fields.name", value: "Core" }]);
		expect(grouped.map((group) => group.relation.table)).toEqual(
			expect.arrayContaining([
				"lucid_document__articles__fld__rel__author",
				"lucid_document__articles__hero__rel__featured",
				"lucid_document__articles__fld__rel__cta",
			]),
		);
	});
});
