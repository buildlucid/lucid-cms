import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getStoredMetadataFilePath } from "../metadata.js";
import getMetadata from "./get-metadata.js";
import rename from "./rename.js";
import stream from "./stream.js";
import uploadSingle from "./upload-single.js";

describe("file-system upload metadata", () => {
	let uploadDir: string;

	beforeEach(async () => {
		uploadDir = await mkdtemp(path.join(os.tmpdir(), "lucid-fs-media-"));
	});

	afterEach(async () => {
		await rm(uploadDir, { recursive: true, force: true });
	});

	it("preserves mime metadata for extensionless keys", async () => {
		const options = {
			uploadDir,
			secretKey: "secret",
		};

		const uploadRes = await uploadSingle(options)({
			key: "public/uuid",
			data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
			meta: {
				mimeType: "image/svg+xml",
				extension: "svg",
				size: 46,
				type: "image",
			},
		});

		expect(uploadRes.error).toBeUndefined();

		const metadataRes = await getMetadata(options)("public/uuid");
		expect(metadataRes.error).toBeUndefined();
		expect(metadataRes.data?.mimeType).toBe("image/svg+xml");

		const metadataFile = await readFile(
			getStoredMetadataFilePath(uploadDir),
			"utf8",
		);
		expect(JSON.parse(metadataFile)).toEqual({
			"public/uuid": {
				mimeType: "image/svg+xml",
				extension: "svg",
			},
		});

		const streamRes = await stream(options)("public/uuid");
		expect(streamRes.error).toBeUndefined();
		expect(streamRes.data?.contentType).toBe("image/svg+xml");
		expect(streamRes.data?.etag).toBeTruthy();

		const conditionalStreamRes = await stream(options)("public/uuid", {
			ifNoneMatch: `"${streamRes.data?.etag}"`,
		});
		expect(conditionalStreamRes.error).toBeUndefined();
		expect(conditionalStreamRes.data?.notModified).toBe(true);
		expect(conditionalStreamRes.data?.body).toEqual(new Uint8Array());
	});

	it("moves stored mime metadata when a key is renamed", async () => {
		const options = {
			uploadDir,
			secretKey: "secret",
		};

		await uploadSingle(options)({
			key: "public/source",
			data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
			meta: {
				mimeType: "image/svg+xml",
				extension: "svg",
				size: 46,
				type: "image",
			},
		});

		const renameRes = await rename(options)({
			from: "public/source",
			to: "private/source",
		});

		expect(renameRes.error).toBeUndefined();

		const streamRes = await stream(options)("private/source");
		expect(streamRes.error).toBeUndefined();
		expect(streamRes.data?.contentType).toBe("image/svg+xml");
		expect(streamRes.data?.etag).toBeTruthy();
	});
});
