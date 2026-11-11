import { describe, expect, requires, test } from "#harness/vitest";
import {
	completeUpload,
	createMedia,
	fetchCdn,
	files,
	getMedia,
	listStoredKeys,
	type MediaFile,
	sendUpload,
	startUpload,
	uploadFile,
	uploadMedia,
} from "#shared/media";

const UPLOADER = ["media:create", "media:update"];

const KINDS: Array<{ name: string; file: MediaFile; type: string }> = [
	{ name: "PNG", file: files.png(), type: "image" },
	{ name: "JPEG", file: files.jpeg(), type: "image" },
	{ name: "SVG", file: files.svg(), type: "image" },
	{ name: "PDF", file: files.pdf(), type: "document" },
	{ name: "MP3", file: files.mp3(), type: "audio" },
	{ name: "MP4", file: files.mp4(), type: "video" },
	{ name: "text file", file: files.text(), type: "document" },
];

describe("uploading media", () => {
	requires("feature:mediaStorage");

	test.for(KINDS)(
		"stores a $name and serves back the same bytes",
		async ({ file, type }, { lucid }) => {
			const admin = await lucid.admin();
			const id = await uploadMedia(admin, { title: file.name, file });
			const media = await getMedia(admin, id);

			const served = await fetchCdn(lucid.session(), media.url);

			expect(media.type).toBe(type);
			expect(media.meta.mimeType).toBe(file.mimeType);
			expect(media.meta.fileSize).toBe(file.bytes.byteLength);
			expect(served.status).toBe(200);
			expect(served.headers.get("content-type")).toBe(file.mimeType);
			expect(new Uint8Array(await served.arrayBuffer())).toEqual(
				new Uint8Array(file.bytes),
			);
		},
	);

	test("keeps the file's own extension in its URL", async ({ lucid }) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, { title: "Song", file: files.mp3() });

		const media = await getMedia(admin, id);

		expect(media.meta.extension).toBe("mp3");
		expect(media.url).toMatch(/\/sound\.mp3$/);
	});

	test("only the person who started an upload can finish or abort it", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const other = await lucid.user({ permissions: UPLOADER });
		const file = files.text("Mine\n");
		const started = await startUpload(admin, file);
		await sendUpload(admin, started.body.data, file);

		const completedByOther = await completeUpload(
			other.session,
			started.body.data.sessionId,
		);
		const abortedByOther = await other.session.request({
			method: "DELETE",
			path: `/api/v1/media/upload-session/${started.body.data.sessionId}`,
		});
		const completed = await completeUpload(admin, started.body.data.sessionId);

		expect(completedByOther.status).toBe(404);
		expect(abortedByOther.status).toBe(404);
		expect(completed.status).toBe(200);
	});

	test("an aborted upload can't be finished or made into media", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const file = files.text("Abandoned\n");
		const started = await startUpload(admin, file);
		await sendUpload(admin, started.body.data, file);

		const aborted = await admin.request({
			method: "DELETE",
			path: `/api/v1/media/upload-session/${started.body.data.sessionId}`,
		});
		const completed = await completeUpload(admin, started.body.data.sessionId);
		const created = await createMedia(admin, started.body.data.key, {
			title: "Abandoned",
			fileName: file.name,
		});

		expect(aborted.status).toBeLessThan(300);
		expect(completed.status).toBe(404);
		expect(created.status).toBe(400);
	});

	test("an uploaded file becomes media only once", async ({ lucid }) => {
		const admin = await lucid.admin();
		const file = files.text("Once\n");
		const key = await uploadFile(admin, file);

		const first = await createMedia(admin, key, {
			title: "First",
			fileName: file.name,
		});
		const second = await createMedia(admin, key, {
			title: "Second",
			fileName: file.name,
		});
		const listed = await admin.request<{ data: Array<{ id: number }> }>({
			path: "/api/v1/media",
			query: { "filter[key]": key },
		});

		expect(first.status).toBe(201);
		expect(second.status).toBe(400);
		expect(listed.body.data.map((media) => media.id)).toEqual([
			first.body.data.id,
		]);
	});

	test("media can't be made from a key that was never uploaded", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();

		const created = await createMedia(
			admin,
			"public/00000000000000000000000000000000",
			{ title: "Nothing", fileName: "nothing.txt" },
		);

		expect(created.status).toBe(400);
	});

	test("a file is never stored as a type its bytes contradict", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const disguised: MediaFile = {
			...files.png(),
			name: "notes.txt",
			mimeType: "text/plain",
		};
		const key = await uploadFile(admin, disguised);

		//* storage that reads the bytes records the image they are, and storage that keeps the claimed type is refused
		const created = await createMedia(admin, key, {
			title: "Disguised",
			fileName: disguised.name,
		});

		if (created.status === 201) {
			const media = await getMedia(admin, created.body.data.id);
			expect(media.type).toBe("image");
			expect(media.meta.mimeType).toBe("image/png");
		} else {
			expect(created.status).toBe(400);
		}
	});

	test("uploads at the same time keep their own types", async ({ lucid }) => {
		const admin = await lucid.admin();
		const uploads = Array.from({ length: 12 }, (_, index) =>
			index % 2 === 0
				? files.text(`Parallel ${index}\n`, `parallel-${index}.txt`)
				: files.svg(`<title>${index}</title>`),
		);

		const ids = await Promise.all(
			uploads.map((file) => uploadMedia(admin, { title: file.name, file })),
		);
		const served = await Promise.all(
			ids.map(async (id) => {
				const media = await getMedia(admin, id);
				const response = await fetchCdn(lucid.session(), media.url);
				return response.headers.get("content-type");
			}),
		);

		expect(served).toEqual(uploads.map((file) => file.mimeType));
	});
});

describe("files a failed upload leaves behind", () => {
	requires("plugin:filesystem", "mode:host");

	test("media that fails to save removes its file", async ({ lucid }) => {
		const admin = await lucid.admin();
		const file = files.text("Unsaved\n");
		const key = await uploadFile(admin, file);

		//* an unknown locale is only refused once the file has been checked and counted
		const created = await createMedia(admin, key, {
			title: "Unsaved",
			fileName: file.name,
			body: { title: [{ localeCode: "xx-missing", value: "Unsaved" }] },
		});

		expect(created.status).toBe(400);
		expect(await listStoredKeys(lucid.uploads)).not.toContain(key);
	});
});
