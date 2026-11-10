import { SQLiteAdapter } from "@lucidcms/sqlite";
import { afterAll, describe, expect, test } from "vitest";
import defineBrick from "../../../libs/collection/define-brick.js";
import defineCollection from "../../../libs/collection/define-collection.js";
import field from "../../../libs/collection/definitions/fields/field.js";
import inferSchema from "../../../libs/collection/schema/infer-schema.js";
import type { CollectionSchemaTable } from "../../../libs/collection/schema/types.js";
import type { LucidBrickTableName } from "../../../libs/db/tables/index.js";
import checkFilterAccess from "./check-filter-access.js";

describe("checkFilterAccess", async () => {
	const db = new SQLiteAdapter({ database: ":memory:" });
	const connection = await db.connect();

	afterAll(() => connection.destroy());

	const hidden = { read: true } as const;
	const People = defineCollection({
		key: "people",
		mode: "multiple",
		details: { labels: { singular: "Person", plural: "People" } },
		fields: [field.text("name"), field.text("salary", { permissions: hidden })],
	});
	const Articles = defineCollection({
		key: "articles",
		mode: "multiple",
		details: { labels: { singular: "Article", plural: "Articles" } },
		bricks: {
			builder: [
				defineBrick({
					key: "hero",
					fields: [
						field.text("name", { permissions: hidden }),
						field.relation("featured", { collection: "people" }),
					],
				}),
			],
		},
		fields: [
			field.text("title"),
			field.text("secret", { permissions: hidden }),
			field.relation("author", { collection: "people" }),
		],
	});
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
				filter: { "fields.title": { value: "Hello" } },
				filterOr: [[{ key: "fields.author.fields.name", value: "Will" }]],
			}).error,
		).toBeUndefined();
	});

	test("rejects hidden fields in filters, OR groups and sorts", () => {
		for (const query of [
			{ filter: { "fields.secret": { value: "x" } } },
			{
				filterOr: [
					[{ key: "fields.title", value: "x" }],
					[{ key: "fields.secret", value: "x" }],
				],
			},
			{ sortKeys: ["fields.secret"] },
		]) {
			expect(check(query).error?.status).toBe(400);
		}
	});

	test("rejects hidden fields in the collection a relation filter reaches", () => {
		expect(
			check({ filter: { "fields.author.fields.salary": { value: 100 } } }).error
				?.status,
		).toBe(400);
	});

	test("checks a brick relation's target fields against the target collection only", () => {
		expect(
			check({
				filter: { "bricks.hero.featured.fields.name": { value: "Will" } },
			}).error,
		).toBeUndefined();
		expect(
			check({ filter: { "bricks.hero.name": { value: "Will" } } }).error
				?.status,
		).toBe(400);
	});
});
