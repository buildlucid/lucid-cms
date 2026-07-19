import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { RelationDocumentFilter } from "../../utils/helpers/group-document-filters.js";
import DocumentsRepository from "./documents.js";

describe("related document repository filters", () => {
	const db = new SQLiteAdapter({ database: ":memory:" });
	const Documents = new DocumentsRepository(db.client, db);

	beforeAll(async () => {
		await db.client.schema
			.createTable("lucid_document__articles")
			.addColumn("id", "integer", (column) => column.primaryKey())
			.execute();
		await db.client.schema
			.createTable("lucid_document__articles__ver")
			.addColumn("id", "integer", (column) => column.primaryKey())
			.addColumn("document_id", "integer", (column) => column.notNull())
			.execute();
		await db.client.schema
			.createTable("lucid_document__articles__fld__rel__author")
			.addColumn("document_id", "integer", (column) => column.notNull())
			.addColumn("document_version_id", "integer", (column) => column.notNull())
			.addColumn("_collection_key", "text", (column) => column.notNull())
			.addColumn("_document_id", "integer", (column) => column.notNull())
			.execute();
		await db.client.schema
			.createTable("lucid_document__people")
			.addColumn("id", "integer", (column) => column.primaryKey())
			.addColumn("is_deleted", "integer", (column) => column.notNull())
			.addColumn("tenant_key", "text")
			.execute();
		await db.client.schema
			.createTable("lucid_document__people__ver")
			.addColumn("id", "integer", (column) => column.primaryKey())
			.addColumn("document_id", "integer", (column) => column.notNull())
			.addColumn("type", "text", (column) => column.notNull())
			.execute();
		await db.client.schema
			.createTable("lucid_document__people__fld")
			.addColumn("document_id", "integer", (column) => column.notNull())
			.addColumn("document_version_id", "integer", (column) => column.notNull())
			.addColumn("_first_name", "text")
			.addColumn("_last_name", "text")
			.execute();

		await db.client
			.insertInto("lucid_document__articles")
			.values([{ id: 1 }, { id: 2 }])
			.execute();
		await db.client
			.insertInto("lucid_document__articles__ver")
			.values([
				{ id: 101, document_id: 1 },
				{ id: 102, document_id: 2 },
			])
			.execute();
		await db.client
			.insertInto("lucid_document__articles__fld__rel__author")
			.values([
				{
					document_id: 1,
					document_version_id: 101,
					_collection_key: "people",
					_document_id: 10,
				},
				{
					document_id: 1,
					document_version_id: 101,
					_collection_key: "people",
					_document_id: 11,
				},
				{
					document_id: 2,
					document_version_id: 102,
					_collection_key: "people",
					_document_id: 12,
				},
			])
			.execute();
		await db.client
			.insertInto("lucid_document__people")
			.values([
				{ id: 10, is_deleted: 0, tenant_key: null },
				{ id: 11, is_deleted: 0, tenant_key: null },
				{ id: 12, is_deleted: 0, tenant_key: null },
			])
			.execute();
		await db.client
			.insertInto("lucid_document__people__ver")
			.values([
				{ id: 201, document_id: 10, type: "latest" },
				{ id: 202, document_id: 11, type: "latest" },
				{ id: 203, document_id: 12, type: "latest" },
			])
			.execute();
		await db.client
			.insertInto("lucid_document__people__fld")
			.values([
				{
					document_id: 10,
					document_version_id: 201,
					_first_name: "Will",
					_last_name: "Other",
				},
				{
					document_id: 11,
					document_version_id: 202,
					_first_name: "Other",
					_last_name: "Yallop",
				},
				{
					document_id: 12,
					document_version_id: 203,
					_first_name: "Will",
					_last_name: "Yallop",
				},
			])
			.execute();
	});

	afterAll(() => db.client.destroy());

	test("compiles one version-aware semi-join for conditions on the same related document", () => {
		const relationFilter: RelationDocumentFilter = {
			relation: {
				table: "lucid_document__articles__fld__rel__author",
				collectionKeyColumn: "_collection_key",
				documentIdColumn: "_document_id",
			},
			target: {
				collectionKey: "people",
				versionType: "latest",
				tables: {
					document: "lucid_document__people",
					versions: "lucid_document__people__ver",
				},
				documentFilters: [],
				brickFilters: [
					{
						table: "lucid_document__people__fld",
						filters: [
							{
								key: "first_name",
								column: "_first_name",
								value: "Will",
								operator: "=",
							},
							{
								key: "last_name",
								column: "_last_name",
								value: "Yallop",
								operator: "=",
							},
						],
					},
				],
			},
		};
		const baseQuery = db.client
			.selectFrom("lucid_document__articles")
			.innerJoin(
				"lucid_document__articles__ver",
				"lucid_document__articles__ver.document_id",
				"lucid_document__articles.id",
			)
			.select("lucid_document__articles.id");
		const query = Documents.applyRelationDocumentFiltersToQuery(
			baseQuery,
			[relationFilter],
			"lucid_document__articles",
			"lucid_document__articles__ver",
			"tenant-a",
		).compile();

		expect(query.sql).toContain(
			'from "lucid_document__articles__fld__rel__author" as "rdf_relation"',
		);
		expect(query.sql).toContain(
			'inner join "lucid_document__people" as "rdf_document"',
		);
		expect(query.sql).toContain(
			'inner join "lucid_document__people__ver" as "rdf_version"',
		);
		expect(query.sql).toContain(
			'"rdf_relation"."document_version_id" = "lucid_document__articles__ver"."id"',
		);
		expect(query.sql).toContain(
			'"bf"."document_version_id" = "rdf_version"."id"',
		);
		expect(
			query.sql.match(/from "lucid_document__people__fld" as "bf"/g),
		).toHaveLength(1);
		expect(query.parameters).toEqual(
			expect.arrayContaining([
				"people",
				"latest",
				"tenant-a",
				"Will",
				"Yallop",
			]),
		);
	});

	test("requires all grouped conditions to match one related document", async () => {
		const relationFilter: RelationDocumentFilter = {
			relation: {
				table: "lucid_document__articles__fld__rel__author",
				collectionKeyColumn: "_collection_key",
				documentIdColumn: "_document_id",
			},
			target: {
				collectionKey: "people",
				versionType: "latest",
				tables: {
					document: "lucid_document__people",
					versions: "lucid_document__people__ver",
				},
				documentFilters: [],
				brickFilters: [
					{
						table: "lucid_document__people__fld",
						filters: [
							{
								key: "first_name",
								column: "_first_name",
								value: "Will",
								operator: "=",
							},
							{
								key: "last_name",
								column: "_last_name",
								value: "Yallop",
								operator: "=",
							},
						],
					},
				],
			},
		};
		const baseQuery = db.client
			.selectFrom("lucid_document__articles")
			.innerJoin(
				"lucid_document__articles__ver",
				"lucid_document__articles__ver.document_id",
				"lucid_document__articles.id",
			)
			.select("lucid_document__articles.id");
		const rows = await Documents.applyRelationDocumentFiltersToQuery(
			baseQuery,
			[relationFilter],
			"lucid_document__articles",
			"lucid_document__articles__ver",
			"tenant-a",
		).execute();

		expect(rows).toEqual([{ id: 2 }]);
	});
});
