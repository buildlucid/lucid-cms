import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, describe, expect, test } from "vitest";
import MediaFoldersRepository from "./media-folders";

describe("Tests for the media folders repository", async () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});
	const connection = await db.connect();

	afterAll(() => connection.destroy());

	await db.migrateToLatest(connection);
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

	test("includes global folders while excluding other tenant folders", async () => {
		const marketingRoot = await MediaFolders.createSingle({
			data: {
				title: "Marketing root",
				tenant_key: "marketing",
				parent_folder_id: null,
			},
			returning: ["id"],
			validation: { enabled: true },
		});
		expect(marketingRoot.error).toBeUndefined();
		if (marketingRoot.error) return;

		const anyrepRoot = await MediaFolders.createSingle({
			data: {
				title: "Anyrep root",
				tenant_key: "anyrep",
				parent_folder_id: null,
			},
			returning: ["id"],
			validation: { enabled: true },
		});
		expect(anyrepRoot.error).toBeUndefined();
		if (anyrepRoot.error) return;

		const globalRoot = await MediaFolders.createSingle({
			data: {
				title: "Global root",
				tenant_key: null,
				parent_folder_id: null,
			},
			returning: ["id"],
			validation: { enabled: true },
		});
		expect(globalRoot.error).toBeUndefined();
		if (globalRoot.error) return;

		const marketingChild = await MediaFolders.createSingle({
			data: {
				title: "Marketing child",
				tenant_key: "marketing",
				parent_folder_id: marketingRoot.data.id,
			},
			returning: ["id"],
			validation: { enabled: true },
		});
		expect(marketingChild.error).toBeUndefined();
		if (marketingChild.error) return;

		const globalChild = await MediaFolders.createSingle({
			data: {
				title: "Global child",
				tenant_key: null,
				parent_folder_id: globalRoot.data.id,
			},
			returning: ["id"],
			validation: { enabled: true },
		});
		expect(globalChild.error).toBeUndefined();
		if (globalChild.error) return;

		const foldersRes = await MediaFolders.selectMultipleWithCounts({
			queryParams: {},
			tenantKey: "marketing",
			validation: { enabled: true },
		});
		expect(foldersRes.error).toBeUndefined();
		if (foldersRes.error) return;

		expect(foldersRes.data[0].map((folder) => folder.title).sort()).toEqual([
			"Global child",
			"Global root",
			"Marketing child",
			"Marketing root",
		]);

		const descendantsRes = await MediaFolders.getDescendantIds({
			folderIds: [
				marketingRoot.data.id,
				anyrepRoot.data.id,
				globalRoot.data.id,
			],
			tenantKey: "marketing",
		});
		expect(descendantsRes.error).toBeUndefined();
		if (descendantsRes.error) return;

		expect(
			descendantsRes.data.map((folder) => folder.id).sort((a, b) => a - b),
		).toEqual(
			[
				marketingRoot.data.id,
				marketingChild.data.id,
				globalRoot.data.id,
				globalChild.data.id,
			].sort((a, b) => a - b),
		);

		const ownedDescendantsRes = await MediaFolders.getDescendantIds({
			folderIds: [
				marketingRoot.data.id,
				anyrepRoot.data.id,
				globalRoot.data.id,
			],
			tenantKey: "marketing",
			scope: "owner",
		});
		expect(ownedDescendantsRes.error).toBeUndefined();
		if (ownedDescendantsRes.error) return;

		expect(
			ownedDescendantsRes.data.map((folder) => folder.id).sort((a, b) => a - b),
		).toEqual(
			[marketingRoot.data.id, marketingChild.data.id].sort((a, b) => a - b),
		);
	});
});
