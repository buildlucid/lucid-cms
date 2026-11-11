import { describe, expect, requires, test, useVariant } from "#harness/vitest";
import { IMAGE_PRESET, MEDIA_LIMITS } from "#shared/fragments/media";
import {
	countVariants,
	createMedia,
	fetchCdn,
	files,
	listStoredKeys,
	readStorageCounter,
	sendUpload,
	startUpload,
	getMedia,
	sumStoredSizes,
	uploadFile,
	uploadMedia,
} from "#shared/media";

useVariant("media-limits");

describe("upload limits", () => {
	requires("feature:mediaStorage");

	test("refuses to start an upload larger than the limit", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();

		const started = await startUpload(
			admin,
			files.sized(MEDIA_LIMITS.uploadBytes + 1),
		);

		expect(started.status).toBe(413);
	});

	test("refuses a file larger than the upload it was started for", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const started = await startUpload(admin, files.sized(10));

		const sent = await sendUpload(
			admin,
			started.body.data,
			files.sized(MEDIA_LIMITS.uploadBytes + 1),
		);

		expect(sent.status).toBe(413);
	});
});

describe("what media accepts for its type", () => {
	requires("feature:mediaStorage");

	test.for([
		{ field: "a focal point", body: { focalPoint: { x: 0.5, y: 0.5 } } },
		{
			field: "a crop",
			body: { crop: { x: 0, y: 0, width: 1, height: 1 } },
		},
	])(
		"refuses $field on a file that isn't an image",
		async ({ body }, { lucid }) => {
			const admin = await lucid.admin();
			const file = files.text("Not an image\n");
			const key = await uploadFile(admin, file);

			const created = await createMedia(admin, key, {
				title: "Not an image",
				fileName: file.name,
				body,
			});

			expect(created.status).toBe(400);
		},
	);

	test("only a video can have a poster", async ({ lucid }) => {
		const admin = await lucid.admin();
		const poster = await uploadMedia(admin, {
			title: "Poster",
			file: files.png(),
		});
		const file = files.png({ shade: 10 });
		const key = await uploadFile(admin, file);

		const created = await createMedia(admin, key, {
			title: "Not a video",
			fileName: file.name,
			body: { posterId: poster },
		});

		expect(created.status).toBe(400);
	});

	test("a video's poster is hidden from the library", async ({ lucid }) => {
		const admin = await lucid.admin();
		const poster = await uploadMedia(admin, {
			title: "Poster",
			file: files.png(),
		});
		const file = files.mp4();
		const key = await uploadFile(admin, file);

		const created = await createMedia(admin, key, {
			title: "Video",
			fileName: file.name,
			body: { posterId: poster },
		});
		const listed = await admin.request<{ data: Array<{ id: number }> }>({
			path: "/api/v1/media",
			query: { "filter[id:in]": [poster, created.body.data.id] },
		});

		expect(created.status).toBe(201);
		expect(listed.body.data.map((media) => media.id)).toEqual([
			created.body.data.id,
		]);
	});
});

describe("image variants with format queries", () => {
	requires("plugin:sharp");

	test("stores only so many variants of a file, and still serves the rest", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, { title: "Many", file: files.png() });
		const { key, url } = await getMedia(admin, id);
		const formats = ["webp", "avif", "jpeg"] as const;

		const served = [];
		for (const format of formats) {
			const response = await fetchCdn(lucid.session(), url, {
				query: { format },
			});
			served.push(response.headers.get("content-type"));
		}

		expect(served).toEqual(formats.map((format) => `image/${format}`));
		expect(await countVariants(lucid, key)).toBe(
			MEDIA_LIMITS.maxVariantsPerFile,
		);
	});

	test("lets the Accept header choose the format, and says so", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, { title: "Chosen", file: files.png() });
		const { url } = await getMedia(admin, id);

		const chosen = await fetchCdn(lucid.session(), url, {
			query: { preset: IMAGE_PRESET.name },
			headers: { accept: "image/avif,*/*" },
		});
		const unchosen = await fetchCdn(lucid.session(), url, {
			query: { preset: IMAGE_PRESET.name },
			headers: { accept: "*/*" },
		});

		expect(chosen.headers.get("content-type")).toBe("image/avif");
		expect(chosen.headers.get("vary")).toMatch(/Accept/);
		//* the preset's own format, when the browser names none
		expect(unchosen.headers.get("content-type")).toBe(
			`image/${IMAGE_PRESET.format}`,
		);
	});
});

describe("when storage fills up", () => {
	requires("feature:mediaStorage");

	test("uploads at the same time never take storage past its limit", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const size = MEDIA_LIMITS.uploadBytes - 1024;
		const room = Math.floor(
			(MEDIA_LIMITS.storageBytes - (await readStorageCounter(lucid))) / size,
		);
		const keys = [];
		for (let index = 0; index < room + 3; index++) {
			keys.push(await uploadFile(admin, files.sized(size)));
		}

		const created = await Promise.all(
			keys.map((key, index) =>
				createMedia(admin, key, {
					title: `Racing ${index}`,
					fileName: `sized-${size}.txt`,
				}),
			),
		);

		expect(created.filter((response) => response.status === 201)).toHaveLength(
			room,
		);
		expect(await readStorageCounter(lucid)).toBe(await sumStoredSizes(lucid));
		expect(await readStorageCounter(lucid)).toBeLessThanOrEqual(
			MEDIA_LIMITS.storageBytes,
		);
	});

	test("refuses media once storage is full, and keeps nothing of it", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const size = MEDIA_LIMITS.uploadBytes - 1024;
		const stored: number[] = [];
		//* fill what is left, whatever earlier tests in the file stored
		while (
			(await readStorageCounter(lucid)) + size <=
			MEDIA_LIMITS.storageBytes
		) {
			stored.push(
				await uploadMedia(admin, {
					title: "Filler",
					file: files.sized(size),
				}),
			);
		}
		const counted = await readStorageCounter(lucid);
		const file = files.sized(size);
		const key = await uploadFile(admin, file);

		const created = await createMedia(admin, key, {
			title: "Too much",
			fileName: file.name,
		});

		expect(created.status).toBe(413);
		expect(await readStorageCounter(lucid)).toBe(counted);
		if (lucid.capabilities.includes("plugin:filesystem")) {
			expect(await listStoredKeys(lucid.uploads)).not.toContain(key);
		}
	});

	test("the storage counter matches what is stored", async ({ lucid }) => {
		const admin = await lucid.admin();
		await uploadMedia(admin, { title: "Counted", file: files.png() });

		expect(await readStorageCounter(lucid)).toBe(await sumStoredSizes(lucid));
	});
});
