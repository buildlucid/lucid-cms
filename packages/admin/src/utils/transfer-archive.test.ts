import type { TransferFile, TransferMediaEntry } from "@types";
import { describe, expect, it } from "vitest";
import { createTransferDownload, readTransferUpload } from "./transfer-archive";

const logo: TransferMediaEntry = {
	uid: "logo",
	fileName: "logo.png",
	mimeType: "image/png",
	type: "image",
	size: 3,
	public: true,
	folder: [],
	meta: {
		width: null,
		height: null,
		duration: null,
		focalPoint: null,
		blurHash: null,
		averageColor: null,
		base64: null,
		isDark: null,
		isLight: null,
	},
	text: {},
	url: null,
};

const file: TransferFile = {
	lucid: { format: 1, version: "1.0.0" },
	source: { instanceId: "site", url: "https://example.com" },
	exportedAt: "2026-11-02T00:00:00.000Z",
	locales: ["en"],
	resources: { media: [logo] },
};

describe("createTransferDownload", () => {
	it("bundles media files in a zip that reads back with them", async () => {
		const bytes = Uint8Array.from([1, 2, 3]);
		const download = await createTransferDownload(file, {
			bundle: true,
			files: new Map([["files/logo.png", bytes]]),
		});
		const upload = await readTransferUpload(
			new File([download.blob], "export.zip"),
		);

		expect(download.extension).toBe("zip");
		expect(download.missing).toBe(0);
		expect(upload.file.resources.media?.[0]?.file).toBe("files/logo.png");
		expect(Array.from(upload.files.get("files/logo.png") ?? [])).toEqual([
			1, 2, 3,
		]);
	});

	it("keeps files it can't bundle linked by URL", async () => {
		const download = await createTransferDownload(file, { bundle: true });
		const upload = await readTransferUpload(
			new File([download.blob], "export.zip"),
		);

		expect(download.missing).toBe(1);
		expect(upload.file.resources.media?.[0]?.file).toBeUndefined();
		expect(upload.files.size).toBe(0);
	});

	it("downloads JSON when files aren't bundled", async () => {
		const download = await createTransferDownload(file, { bundle: false });
		const upload = await readTransferUpload(
			new File([download.blob], "export.json"),
		);

		expect(download.extension).toBe("json");
		expect(upload.file).toEqual(file);
	});
});
