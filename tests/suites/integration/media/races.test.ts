import { describe, expect, requires, test } from "#harness/vitest";
import {
	createMedia,
	fetchCdn,
	files,
	findStorageDrift,
	getMedia,
	replaceMedia,
	uploadFile,
	uploadMedia,
} from "#shared/helpers/media";

describe("media changed at the same time", () => {
	requires("feature:mediaStorage");

	test("an uploaded file becomes media once, however many ask at once", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const file = files.text("Contested\n");
		const key = await uploadFile(admin, file);

		const created = await Promise.all(
			Array.from({ length: 4 }, (_, index) =>
				createMedia(admin, key, {
					title: `Attempt ${index}`,
					fileName: file.name,
				}),
			),
		);

		expect(created.filter((response) => response.status === 201)).toHaveLength(
			1,
		);
	});

	test("replacing a file twice at once leaves one of them", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, { title: "Twice", file: files.png() });
		const replacements = [files.png({ shade: 1 }), files.png({ shade: 2 })];

		await Promise.all(
			replacements.map((file) => replaceMedia(admin, id, file)),
		);
		const media = await getMedia(admin, id);
		const served = await fetchCdn(lucid.session(), media.url);
		const bytes = new Uint8Array(await served.arrayBuffer());

		expect(served.status).toBe(200);
		expect(
			replacements.some(
				(file) =>
					bytes.length === file.bytes.byteLength &&
					bytes.every((byte, index) => byte === file.bytes[index]),
			),
		).toBe(true);
	});
});

describe("what changes at the same time leave behind", () => {
	requires("plugin:filesystem", "mode:host");

	test("deleting media while its file is replaced leaves storage in step", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, { title: "Raced", file: files.png() });

		await Promise.all([
			replaceMedia(admin, id, files.png({ shade: 3 })),
			admin.request({
				method: "DELETE",
				path: `/api/v1/media/${id}/permanent`,
			}),
		]);

		expect(await findStorageDrift(lucid)).toEqual({
			missing: [],
			orphaned: [],
		});
	});
});
