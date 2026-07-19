import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, describe, expect, test } from "vitest";
import BrickBuilder from "../../../libs/collection/builders/brick-builder/index.js";
import CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import inferSchema from "../../../libs/collection/schema/infer-schema.js";
import type { CollectionSchemaTable } from "../../../libs/collection/schema/types.js";
import { copy } from "../../../libs/i18n/index.js";
import type { LucidBrickTableName } from "../../../types.js";
import { groupRelationDocumentFilterConditions } from "./resolve-relation-document-filters.js";

describe("relation document filter grouping", () => {
	const db = new SQLiteAdapter({ database: ":memory:" });

	afterAll(() => db.client.destroy());

	const HeroBrick = new BrickBuilder("hero").addRelation("featured", {
		collection: "pages",
	});
	const Articles = new CollectionBuilder("articles", {
		mode: "multiple",
		details: {
			name: copy("admin:tests.collections.articles.name", {
				defaultMessage: "Articles",
			}),
			singularName: copy("admin:tests.collections.articles.singularName", {
				defaultMessage: "Article",
			}),
		},
		bricks: { builder: [HeroBrick] },
	})
		.addRelation("author", { collection: ["people", "teams"] })
		.addRepeater("cards")
		.addRelation("cta", { collection: "pages" })
		.endRepeater();
	const schema = inferSchema(Articles, db).data?.tables.filter(
		(table) => table.type !== "document" && table.type !== "versions",
	) as CollectionSchemaTable<LucidBrickTableName>[];

	test("supports explicit targets and defaults implicit traversals to the first collection", () => {
		const grouped = groupRelationDocumentFilterConditions({
			collection: Articles,
			bricksTableSchema: schema,
			conditions: [
				{ key: "_author.people._first_name", value: "Will" },
				{ key: "_author._last_name", value: "Yallop" },
				{ key: "_author.teams._name", value: "Core" },
				{ key: "hero._featured._slug", value: "home" },
				{ key: "fields.cards._cta.pages._slug", value: "contact" },
				{ key: "_author", value: "people:1" },
			],
		});

		expect(grouped).toHaveLength(4);
		expect(
			grouped.find((group) => group.targetCollectionKey === "people")
				?.conditions,
		).toEqual([
			{ key: "_first_name", value: "Will" },
			{ key: "_last_name", value: "Yallop" },
		]);
		expect(
			grouped.find((group) => group.targetCollectionKey === "teams")
				?.conditions,
		).toEqual([{ key: "_name", value: "Core" }]);
		expect(grouped.map((group) => group.relation.table)).toEqual(
			expect.arrayContaining([
				"lucid_document__articles__fld__rel__author",
				"lucid_document__articles__hero__rel__featured",
				"lucid_document__articles__fld__rel__cta",
			]),
		);
	});
});
