import { describe, expect, requires, test } from "#harness/vitest";
import { uploadMedia } from "#shared/helpers/media";

describe("media text in locales", () => {
	requires("feature:mediaStorage");

	test("refuses a title in a locale the CMS doesn't have", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, { title: "Kept" });

		const updated = await admin.request({
			method: "PATCH",
			path: `/api/v1/media/${id}`,
			body: { title: [{ localeCode: "xx-missing", value: "Refused" }] },
		});
		const stored = await admin.request({ path: `/api/v1/media/${id}` });

		expect(updated.status).toBe(400);
		expect(JSON.stringify(stored.body)).not.toContain("Refused");
	});
});
