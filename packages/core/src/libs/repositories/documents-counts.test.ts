import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { describe, expect, test } from "vitest";
import createLucidDatabase from "../db/create-lucid-database.js";
import DocumentsRepository from "./documents.js";

describe("document counts by collection", async () => {
	const db = new SQLiteAdapter({ database: ":memory:" });
	const connection = await db.connect();
	const Documents = new DocumentsRepository(
		createLucidDatabase({ client: connection.client, adapter: db }),
	);

	for (const table of ["lucid_document__pages", "lucid_document__posts"]) {
		await connection.client.schema
			.createTable(table)
			.addColumn("id", "integer", (column) => column.primaryKey())
			.addColumn("collection_key", "text", (column) => column.notNull())
			.addColumn("is_deleted", "integer", (column) => column.notNull())
			.execute();
	}
	await connection.client
		.insertInto("lucid_document__pages")
		.values([
			{ id: 1, collection_key: "pages", is_deleted: 0 },
			{ id: 2, collection_key: "pages", is_deleted: 0 },
			{ id: 3, collection_key: "pages", is_deleted: 1 },
		])
		.execute();
	await connection.client
		.insertInto("lucid_document__posts")
		.values([{ id: 1, collection_key: "posts", is_deleted: 1 }])
		.execute();

	test("counts documents that aren't deleted across tables in one query", async () => {
		const counts = await Documents.selectCountsByCollection({
			tables: ["lucid_document__pages", "lucid_document__posts"],
		});

		expect(counts.error).toBeUndefined();
		expect(counts.data).toEqual([{ collection_key: "pages", count: 2 }]);
	});
});
