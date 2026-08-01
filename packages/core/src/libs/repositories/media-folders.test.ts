import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, describe, expect, test } from "vitest";
import MediaFoldersRepository from "./media-folders";

describe("Tests for the media folders repository", async () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});
	const connection = await db.connect();

	afterAll(() => connection.destroy());

	await db.migrateCoreToLatest(connection);
	const MediaFolders = new MediaFoldersRepository(connection.client, db);
	const tables = await connection.client.introspection.getTables();

	test("checks the columnFormats matches the latest state of the DB", async () => {
		const table = tables.find((t) => t.name === MediaFolders.tableName);
		expect(table).toBeDefined();

		for (const column of table?.columns || []) {
			// @ts-expect-error
			expect(MediaFolders.columnFormats[column.name]).toEqual(
				column.dataType.toLowerCase(),
			);
		}
	});

	test("selects folders and resolves their descendants", async () => {
		const root = await MediaFolders.createSingle({
			data: {
				title: "Root",
				parent_folder_id: null,
			},
			returning: ["id"],
			validation: { enabled: true },
		});
		expect(root.error).toBeUndefined();
		if (root.error) return;

		const child = await MediaFolders.createSingle({
			data: {
				title: "Child",
				parent_folder_id: root.data.id,
			},
			returning: ["id"],
			validation: { enabled: true },
		});
		expect(child.error).toBeUndefined();
		if (child.error) return;

		const foldersRes = await MediaFolders.selectMultipleWithCounts({
			queryParams: {},
			validation: { enabled: true },
		});
		expect(foldersRes.error).toBeUndefined();
		if (foldersRes.error) return;

		expect(foldersRes.data[0].map((folder) => folder.title).sort()).toEqual([
			"Child",
			"Root",
		]);

		const descendantsRes = await MediaFolders.getDescendantIds({
			folderIds: [root.data.id],
		});
		expect(descendantsRes.error).toBeUndefined();
		if (descendantsRes.error) return;

		expect(
			descendantsRes.data.map((folder) => folder.id).sort((a, b) => a - b),
		).toEqual([root.data.id, child.data.id].sort((a, b) => a - b));
	});
});
