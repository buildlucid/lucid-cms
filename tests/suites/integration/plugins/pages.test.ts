import { describe, expect, requires, test } from "#harness/vitest";

describe("pages plugin", () => {
	requires("plugin:pages", "collection:landing-page");

	test("adds its route fields to the collection it manages", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();

		const collection = await admin.request<{
			data: { fields: Array<{ key: string }> };
		}>({ path: "/api/v1/collections/landing-page" });

		expect(collection.status).toBe(200);
		expect(collection.body.data.fields.map((field) => field.key)).toContain(
			"slug",
		);
	});

	test("rejects a document without its route fields as a validation error", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();

		const created = await admin.request<{ status: number }>({
			method: "POST",
			path: "/api/v1/documents/landing-page",
			body: { fields: [{ key: "heading", type: "text", value: "Hello" }] },
		});

		expect(created.status).toBe(400);
	});
});
