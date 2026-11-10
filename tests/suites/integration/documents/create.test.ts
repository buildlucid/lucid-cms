import { describe, expect, requires, test } from "#harness/vitest";

describe("creating documents", () => {
	requires("collection:page");

	test("creates a page and reads it back", async ({ lucid }) => {
		const admin = await lucid.admin();

		const created = await admin.request<{ data: { id: number } }>({
			method: "POST",
			path: "/api/v1/documents/page",
			body: {
				fields: [{ key: "title", type: "text", value: "Hello" }],
			},
		});
		expect(created.status).toBe(201);

		const read = await admin.request({
			path: `/api/v1/documents/page/${created.body.data.id}/latest`,
		});
		expect(read.status).toBe(200);
	});
});

describe("row locking", () => {
	//* a placeholder that shows a skipped test and its reason in the report
	requires("database.sharedRowLocks");

	test("holds a referenced row until the transaction commits", () => {});
});
