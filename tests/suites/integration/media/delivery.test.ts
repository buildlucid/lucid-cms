import { describe, expect, requires, test } from "#harness/vitest";
import { FALLBACK_IMAGE_URL } from "#shared/config/fragments/media";
import {
	fetchCdn,
	files,
	getMedia,
	type MediaFile,
	uploadMedia,
} from "#shared/helpers/media";

const SANDBOX =
	"sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:";

describe("serving media from the CDN", () => {
	requires("feature:mediaStorage");

	test("serves a file at its URL, with the file name after the key", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, { title: "Named", file: files.png() });
		const media = await getMedia(admin, id);

		const served = await lucid.session().fetch(new URL(media.url).pathname);

		expect(served.status).toBe(200);
		expect(served.headers.get("content-type")).toBe("image/png");
	});

	test("answers a request for an unchanged file with 304", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, { title: "Cached", file: files.png() });
		const { url } = await getMedia(admin, id);
		const visitor = lucid.session();
		const first = await fetchCdn(visitor, url);
		const etag = first.headers.get("etag");

		const again = await fetchCdn(visitor, url, {
			headers: { "if-none-match": etag ?? "" },
		});

		expect(etag).toBeTruthy();
		expect(again.status).toBe(304);
		expect((await again.arrayBuffer()).byteLength).toBe(0);
	});

	test("serves part of a file for a range request", async ({ lucid }) => {
		const admin = await lucid.admin();
		const file = files.text("0123456789");
		const id = await uploadMedia(admin, { title: "Ranged", file });
		const { url } = await getMedia(admin, id);

		const part = await fetchCdn(lucid.session(), url, {
			headers: { range: "bytes=2-5" },
		});
		const overrun = await fetchCdn(lucid.session(), url, {
			headers: { range: "bytes=6-100" },
		});
		const past = await fetchCdn(lucid.session(), url, {
			headers: { range: "bytes=50-60" },
		});

		expect(part.status).toBe(206);
		expect(part.headers.get("content-range")).toBe("bytes 2-5/10");
		expect(await part.text()).toBe("2345");
		//* a range that runs past the end is read up to the last byte
		expect(overrun.status).toBe(206);
		expect(overrun.headers.get("content-range")).toBe("bytes 6-9/10");
		expect(await overrun.text()).toBe("6789");
		expect(past.status).toBe(416);
	});

	test("lets shared caches keep public files but not private ones", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const publicId = await uploadMedia(admin, {
			title: "Public",
			file: files.png(),
		});
		const privateId = await uploadMedia(admin, {
			title: "Private",
			file: files.png(),
			public: false,
		});

		const [publicFile, privateFile] = await Promise.all([
			fetchCdn(lucid.session(), (await getMedia(admin, publicId)).url),
			fetchCdn(admin, (await getMedia(admin, privateId)).url),
		]);

		expect(publicFile.headers.get("cache-control")).toMatch(/^public/);
		expect(privateFile.headers.get("cache-control")).toMatch(/^private/);
	});

	test("only serves private files to people who are signed in", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, {
			title: "Private",
			file: files.png(),
			public: false,
		});
		const { url } = await getMedia(admin, id);

		const signedOut = await fetchCdn(lucid.session(), url);
		const signedIn = await fetchCdn(admin, url);

		expect(signedOut.status).toBe(401);
		expect(signedIn.status).toBe(200);
	});

	describe("with other people", () => {
		requires("harness:outbox");

		test("hides someone's personal files from people who can't read all media", async ({
			lucid,
		}) => {
			const owner = await lucid.user({
				permissions: ["media:create", "media:update"],
			});
			const id = await uploadMedia(owner.session, {
				title: "Mine",
				file: files.png(),
				owned: true,
			});
			const { url } = await getMedia(owner.session, id);
			const other = await lucid.user({ permissions: ["media:read"] });
			const readsAll = await lucid.user({ permissions: ["media:read-all"] });

			expect((await fetchCdn(owner.session, url)).status).toBe(200);
			expect((await fetchCdn(other.session, url)).status).toBe(404);
			expect((await fetchCdn(readsAll.session, url)).status).toBe(200);
		});
	});

	test.for<{ name: string; file: MediaFile; sandboxed: boolean }>([
		{ name: "an HTML page", file: files.html(), sandboxed: true },
		{ name: "an SVG", file: files.svg(), sandboxed: true },
		{ name: "a PNG", file: files.png(), sandboxed: false },
	])(
		"sandboxes $name only if it could run script",
		async ({ file, sandboxed }, { lucid }) => {
			const admin = await lucid.admin();
			const id = await uploadMedia(admin, { title: file.name, file });

			const served = await fetchCdn(
				lucid.session(),
				(await getMedia(admin, id)).url,
			);

			expect(served.headers.get("x-content-type-options")).toBe("nosniff");
			expect(served.headers.get("content-security-policy")).toBe(
				sandboxed ? SANDBOX : null,
			);
		},
	);

	test("serves media only at its URL, never at the key it's stored under", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, { title: "Stored", file: files.png() });
		const { key } = await getMedia(admin, id);

		expect((await fetchCdn(lucid.session(), `/cdn/${key}`)).status).toBe(404);
	});

	test("sends images that aren't found to the fallback, when asked", async ({
		lucid,
	}) => {
		const missing = "/cdn/00000000-0000-4000-8000-000000000000/missing.png";

		const plain = await fetchCdn(lucid.session(), missing);
		const asImage = await fetchCdn(lucid.session(), missing, {
			query: { fallback: "true" },
			headers: { "sec-fetch-dest": "image" },
		});
		const asDocument = await fetchCdn(lucid.session(), missing, {
			query: { fallback: "true" },
			headers: { "sec-fetch-dest": "document" },
		});

		expect(plain.status).toBe(404);
		expect(asImage.status).toBe(302);
		expect(asImage.headers.get("location")).toBe(FALLBACK_IMAGE_URL);
		expect(asDocument.status).toBe(404);
	});
});

describe("media in the bin", () => {
	requires("feature:mediaStorage");

	test("isn't served to visitors, and is again once restored", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, { title: "Binned", file: files.png() });
		const { url } = await getMedia(admin, id);

		await admin.request({ method: "DELETE", path: `/api/v1/media/${id}` });
		const binned = await fetchCdn(lucid.session(), url);
		const preview = await fetchCdn(admin, url);
		await admin.request({
			method: "POST",
			path: "/api/v1/media/restore",
			body: { ids: [id] },
		});
		const restored = await fetchCdn(lucid.session(), url);

		expect(binned.status).toBe(404);
		//* the bin shows previews to people who can browse it, and shared caches never keep them
		expect(preview.status).toBe(200);
		expect(preview.headers.get("cache-control")).toMatch(/^private/);
		expect(restored.status).toBe(200);
	});

	describe("with another person", () => {
		requires("harness:outbox");

		test("isn't shown to someone who can't browse the library", async ({
			lucid,
		}) => {
			const admin = await lucid.admin();
			const id = await uploadMedia(admin, {
				title: "Binned",
				file: files.png(),
			});
			const { url } = await getMedia(admin, id);
			const outsider = await lucid.user({ permissions: [] });

			await admin.request({ method: "DELETE", path: `/api/v1/media/${id}` });

			expect((await fetchCdn(outsider.session, url)).status).toBe(404);
		});
	});

	test("isn't served through a preset either", async ({ lucid }) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, { title: "Binned", file: files.png() });
		const { url } = await getMedia(admin, id);

		await admin.request({ method: "DELETE", path: `/api/v1/media/${id}` });
		const served = await fetchCdn(lucid.session(), url, {
			query: { preset: "harness-square" },
		});

		expect(served.status).toBe(404);
	});
});
