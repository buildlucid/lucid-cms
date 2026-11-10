import { describe, expect, requires, test } from "#harness/vitest";

describe("localized documents", () => {
	requires("feature:localization", "collection:article", "locale:fr");

	test("stores a value for each locale", async ({ lucid }) => {
		const admin = await lucid.admin();

		const created = await admin.request({
			method: "POST",
			path: "/api/v1/documents/article",
			body: {
				fields: [
					{
						key: "title",
						type: "text",
						translations: { en: "Hello", fr: "Bonjour" },
					},
				],
			},
		});

		expect(created.status).toBe(201);
	});
});
