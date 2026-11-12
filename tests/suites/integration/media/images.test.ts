import { describe, expect, requires, test } from "#harness/vitest";
import { IMAGE_PRESET } from "#shared/config/fragments/media";
import {
	countVariants,
	fetchCdn,
	files,
	getMedia,
	readStorageCounter,
	sumStoredSizes,
	uploadMedia,
} from "#shared/helpers/media";

/** Reads a lossy WebP's width and height from its VP8 frame header. */
const webpSize = (bytes: Buffer) => {
	expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
	expect(bytes.toString("ascii", 8, 16)).toBe("WEBPVP8 ");
	return {
		width: bytes.readUInt16LE(26) & 0x3fff,
		height: bytes.readUInt16LE(28) & 0x3fff,
	};
};

const preset = { preset: IMAGE_PRESET.name };

describe("image presets", () => {
	requires("plugin:sharp");

	test("resizes and converts an image as its preset says", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, {
			title: "Large",
			file: files.png({ width: 32, height: 20 }),
		});
		const { url } = await getMedia(admin, id);

		const served = await fetchCdn(lucid.session(), url, { query: preset });

		expect(served.status).toBe(200);
		expect(served.headers.get("content-type")).toBe("image/webp");
		expect(webpSize(Buffer.from(await served.arrayBuffer()))).toEqual({
			width: IMAGE_PRESET.width,
			height: IMAGE_PRESET.height,
		});
	});

	test("answers a request for an unchanged variant with 304", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, { title: "Cached", file: files.png() });
		const { url } = await getMedia(admin, id);
		const first = await fetchCdn(lucid.session(), url, { query: preset });

		const again = await fetchCdn(lucid.session(), url, {
			query: preset,
			headers: { "if-none-match": first.headers.get("etag") ?? "" },
		});

		expect(again.status).toBe(304);
	});

	test("serves files that aren't images as they are", async ({ lucid }) => {
		const admin = await lucid.admin();
		const file = files.text("Not an image\n");
		const id = await uploadMedia(admin, { title: "Text", file });
		const { url } = await getMedia(admin, id);

		const served = await fetchCdn(lucid.session(), url, { query: preset });

		expect(served.headers.get("content-type")).toBe("text/plain");
		expect(await served.text()).toBe("Not an image\n");
	});
});

describe("stored image variants", () => {
	requires("plugin:sharp", "mode:host");

	test("stores a variant once and counts it as stored", async ({ lucid }) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, { title: "Stored", file: files.png() });
		const { key, url } = await getMedia(admin, id);

		const first = await fetchCdn(lucid.session(), url, { query: preset });
		const second = await fetchCdn(lucid.session(), url, { query: preset });

		expect(await countVariants(lucid, key)).toBe(1);
		expect(second.headers.get("etag")).toBe(first.headers.get("etag"));
		expect(await readStorageCounter(lucid)).toBe(await sumStoredSizes(lucid));
	});

	test("clearing a file's variants frees what they used", async ({ lucid }) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, {
			title: "Cleared",
			file: files.png(),
		});
		const { key, url } = await getMedia(admin, id);
		await fetchCdn(lucid.session(), url, { query: preset });

		const cleared = await admin.request({
			method: "DELETE",
			path: `/api/v1/media/${id}/processed`,
		});

		expect(cleared.status).toBeLessThan(300);
		expect(await countVariants(lucid, key)).toBe(0);
		expect(await readStorageCounter(lucid)).toBe(await sumStoredSizes(lucid));
	});
});
