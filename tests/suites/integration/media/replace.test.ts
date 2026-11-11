import { describe, expect, requires, test } from "#harness/vitest";
import { IMAGE_PRESET } from "#shared/fragments/media";
import {
	countVariants,
	fetchCdn,
	files,
	findStorageDrift,
	getMedia,
	listStoredKeys,
	readStorageCounter,
	replaceMedia,
	sumStoredSizes,
	uploadMedia,
} from "#shared/media";

const bytesOf = async (response: Response) =>
	new Uint8Array(await response.arrayBuffer());

describe("replacing a file", () => {
	requires("feature:mediaStorage");

	test("keeps the media and its URL, and serves the new file from a new key", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, {
			title: "Replaced",
			file: files.png({ width: 8 }),
		});
		const before = await getMedia(admin, id);
		const replacement = files.png({ width: 12, shade: 20 });

		const replaced = await replaceMedia(admin, id, replacement);
		const after = await getMedia(admin, id);

		expect(replaced.status).toBe(204);
		//* the file is stored afresh, but pages that already link to the media keep working
		expect(after.key).not.toBe(before.key);
		expect(after.url).toBe(before.url);
		expect(after.meta.fileSize).toBe(replacement.bytes.byteLength);
		expect(await bytesOf(await fetchCdn(lucid.session(), before.url))).toEqual(
			new Uint8Array(replacement.bytes),
		);
	});

	test("refuses a file of another type, and keeps the old one", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const original = files.png();
		const id = await uploadMedia(admin, { title: "Image", file: original });

		const replaced = await replaceMedia(admin, id, files.text("Not an image"));
		const { url, type } = await getMedia(admin, id);

		expect(replaced.status).toBe(400);
		expect(type).toBe("image");
		expect(await bytesOf(await fetchCdn(lucid.session(), url))).toEqual(
			new Uint8Array(original.bytes),
		);
	});

	test("a replacement that fails to save leaves the media and its file as they were", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const original = files.png();
		const id = await uploadMedia(admin, { title: "Unchanged", file: original });
		const before = await getMedia(admin, id);

		//* a private upload for public media is moved, and an unknown locale is only refused after that
		const replaced = await replaceMedia(admin, id, files.png({ shade: 70 }), {
			public: false,
			body: { title: [{ localeCode: "xx-missing", value: "Refused" }] },
		});
		const after = await getMedia(admin, id);

		expect(replaced.status).toBe(400);
		expect(after.key).toBe(before.key);
		expect(await bytesOf(await fetchCdn(lucid.session(), after.url))).toEqual(
			new Uint8Array(original.bytes),
		);
		//* only filesystem storage in host mode can be compared with the database
		if (
			lucid.capabilities.includes("plugin:filesystem") &&
			lucid.capabilities.includes("mode:host")
		) {
			expect((await findStorageDrift(lucid)).orphaned).toEqual([]);
		}
	});

	test("making media private keeps its URL, which only signed-in people can open", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, { title: "Moving", file: files.png() });
		const before = await getMedia(admin, id);

		const updated = await admin.request({
			method: "PATCH",
			path: `/api/v1/media/${id}`,
			body: { public: false },
		});
		const after = await getMedia(admin, id);

		expect(updated.status).toBe(204);
		expect(after.public).toBe(false);
		expect(after.key).toMatch(/^private\//);
		expect(after.url).toBe(before.url);
		expect((await fetchCdn(lucid.session(), after.url)).status).toBe(401);
		expect((await fetchCdn(admin, after.url)).status).toBe(200);
	});

	test("a visibility change that fails to save leaves the file where it was", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const original = files.png();
		const id = await uploadMedia(admin, { title: "Staying", file: original });
		const before = await getMedia(admin, id);

		//* the file is moved before a generation without an origin is refused
		const updated = await admin.request({
			method: "PATCH",
			path: `/api/v1/media/${id}`,
			body: {
				public: false,
				aiGenerationRequestId: "00000000-0000-4000-8000-000000000000",
			},
		});
		const after = await getMedia(admin, id);

		expect(updated.status).toBe(400);
		expect(after.key).toBe(before.key);
		expect(await bytesOf(await fetchCdn(lucid.session(), before.url))).toEqual(
			new Uint8Array(original.bytes),
		);
	});

	test("can replace a file and change who sees it at once", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, { title: "Both", file: files.png() });
		const before = await getMedia(admin, id);
		const replacement = files.png({ shade: 30 });

		const replaced = await replaceMedia(admin, id, replacement, {
			body: { public: false },
		});
		const after = await getMedia(admin, id);

		expect(replaced.status).toBe(204);
		expect(after.key).toMatch(/^private\//);
		expect((await fetchCdn(lucid.session(), before.url)).status).toBe(401);
		expect(await bytesOf(await fetchCdn(admin, before.url))).toEqual(
			new Uint8Array(replacement.bytes),
		);
	});
});

describe("what a replaced file leaves behind", () => {
	requires("plugin:filesystem", "plugin:sharp", "mode:host");

	test("removes the old file and its variants, and counts only the new one", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, {
			title: "Tidy",
			file: files.png({ width: 32 }),
		});
		const { key, url } = await getMedia(admin, id);
		await fetchCdn(lucid.session(), url, {
			query: { preset: IMAGE_PRESET.name },
		});
		expect(await countVariants(lucid, key)).toBe(1);

		await replaceMedia(admin, id, files.png({ width: 4, shade: 40 }));
		const replaced = await getMedia(admin, id);

		expect(await countVariants(lucid, key)).toBe(0);
		expect(await findStorageDrift(lucid)).toEqual({
			missing: [],
			orphaned: [],
		});
		const stored = await listStoredKeys(lucid.uploads);
		expect(stored).toContain(replaced.key);
		expect(stored).not.toContain(key);
		expect(await readStorageCounter(lucid)).toBe(await sumStoredSizes(lucid));
	});
});
