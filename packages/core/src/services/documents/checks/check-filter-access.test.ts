import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, describe, expect, test } from "vitest";
import BrickBuilder from "../../../libs/collection/builders/brick-builder/index.js";
import CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import inferSchema from "../../../libs/collection/schema/infer-schema.js";
import type { CollectionSchemaTable } from "../../../libs/collection/schema/types.js";
import type { LucidBrickTableName } from "../../../libs/db/tables/index.js";
import checkFilterAccess from "./check-filter-access.js";

describe("checkFilterAccess", async () => {
	const db = new SQLiteAdapter({ database: ":memory:" });
	const connection = await db.connect();

	afterAll(() => connection.destroy());

	const hidden = { read: true } as const;
	const People = new CollectionBuilder("people", {
		mode: "multiple",
		details: { labels: { singular: "Person", plural: "People" } },
	})
		.addText("name")
		.addText("salary", { permissions: hidden });
	const Articles = new CollectionBuilder("articles", {
		mode: "multiple",
		details: { labels: { singular: "Article", plural: "Articles" } },
		bricks: {
			builder: [
				new BrickBuilder("hero")
					.addText("name", { permissions: hidden })
					.addRelation("featured", { collection: "people" }),
			],
		},
	})
		.addText("title")
		.addText("secret", { permissions: hidden })
		.addRelation("author", { collection: "people" });
	const schema = inferSchema(Articles, db).data?.tables.filter(
		(table) => table.type !== "document" && table.type !== "versions",
	) as CollectionSchemaTable<LucidBrickTableName>[];

	const check = (
		query: Pick<
			Parameters<typeof checkFilterAccess>[0],
			"filter" | "filterOr" | "sortKeys"
		>,
	) =>
		checkFilterAccess({
			collection: Articles,
			collections: [Articles, People],
			bricksTableSchema: schema,
			reader: { superAdmin: false, permissions: [] },
			...query,
		});

	test("allows filters on fields the reader can see", () => {
		expect(
			check({
				filter: { _title: { value: "Hello" } },
				filterOr: [[{ key: "_author._name", value: "Will" }]],
			}).error,
		).toBeUndefined();
	});

	test("rejects hidden fields in filters, OR groups and sorts", () => {
		for (const query of [
			{ filter: { _secret: { value: "x" } } },
			{
				filterOr: [
					[{ key: "_title", value: "x" }],
					[{ key: "_secret", value: "x" }],
				],
			},
			{ sortKeys: ["_secret"] },
		]) {
			expect(check(query).error?.status).toBe(400);
		}
	});

	test("rejects hidden fields in the collection a relation filter reaches", () => {
		expect(
			check({ filter: { "_author._salary": { value: 100 } } }).error?.status,
		).toBe(400);
	});

	test("checks a brick relation's target fields against the target collection only", () => {
		expect(
			check({ filter: { "hero._featured._name": { value: "Will" } } }).error,
		).toBeUndefined();
		expect(
			check({ filter: { "hero._name": { value: "Will" } } }).error?.status,
		).toBe(400);
	});
});
