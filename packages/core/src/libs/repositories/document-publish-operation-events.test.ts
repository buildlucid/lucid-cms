import { SQLiteAdapter } from "@lucidcms/db-sqlite";
import { afterAll, describe, expect, test } from "vitest";
import DocumentPublishOperationEventsRepository, {
	documentPublishOperationEventTypes,
} from "./document-publish-operation-events";

describe("Tests for the document publish operation events repository", async () => {
	const db = new SQLiteAdapter({
		database: ":memory:",
	});
	const connection = await db.connect();

	afterAll(() => connection.destroy());

	await db.migrateToLatest(connection);
	const DocumentPublishOperationEvents =
		new DocumentPublishOperationEventsRepository(connection.client, db);
	const tables = await connection.client.introspection.getTables();

	test("checks the columnFormats matches the latest state of the DB", async () => {
		const table = tables.find(
			(t) => t.name === DocumentPublishOperationEvents.tableName,
		);
		expect(table).toBeDefined();

		for (const column of table?.columns || []) {
			// @ts-expect-error
			expect(DocumentPublishOperationEvents.columnFormats[column.name]).toEqual(
				column.dataType.toLowerCase(),
			);
		}
	});

	test("validates all supported publish operation event types", () => {
		for (const eventType of documentPublishOperationEventTypes) {
			const res = DocumentPublishOperationEvents.tableSchema.safeParse({
				id: 1,
				operation_id: 1,
				event_type: eventType,
				user_id: null,
				comment: null,
				metadata: {},
				created_at: new Date().toISOString(),
			});

			expect(res.success).toBe(true);
		}
	});
});
