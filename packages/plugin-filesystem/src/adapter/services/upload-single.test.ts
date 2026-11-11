import { access, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getStoredMetadataPath } from "../metadata.js";
import getMetadata from "./get-metadata.js";
import rename from "./rename.js";
import stream from "./stream.js";
import uploadSingle from "./upload-single.js";

describe("file-system upload metadata", () => {
	const cwd = process.cwd();
	let projectDir: string;
	let uploadDir: string;

	beforeEach(async () => {
		projectDir = await mkdtemp(path.join(os.tmpdir(), "lucid-fs-media-"));
		uploadDir = path.join(projectDir, "uploads");
		await mkdir(uploadDir);
		process.chdir(projectDir);
	});

	afterEach(async () => {
		process.chdir(cwd);
		await rm(projectDir, { recursive: true, force: true });
	});

	it("preserves mime metadata for extensionless keys", async () => {
		const options = {
			uploadDir,
			secretKey: "secret",
		};

		await uploadSingle(options)({} as never, {
			key: "public/uuid",
			body: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
			mimeType: "image/svg+xml",
			extension: "svg",
			size: 46,
			type: "image",
		});

		const metadataRes = await getMetadata(options)({} as never, {
			key: "public/uuid",
		});
		expect(metadataRes.mimeType).toBe("image/svg+xml");
		expect(metadataRes.status).toBe("ready");

		const metadataFile = await readFile(
			getStoredMetadataPath("public/uuid"),
			"utf8",
		);
		expect(JSON.parse(metadataFile)).toEqual({
			mimeType: "image/svg+xml",
			extension: "svg",
		});
		await expect(access(path.join(uploadDir, ".lucid"))).rejects.toThrow();

		const streamRes = await stream(options)({} as never, {
			key: "public/uuid",
		});
		expect(streamRes.contentType).toBe("image/svg+xml");
		expect(streamRes.etag).toBeTruthy();

		const conditionalStreamRes = await stream(options)({} as never, {
			key: "public/uuid",
			ifNoneMatch: `"${streamRes.etag}"`,
		});
		expect(conditionalStreamRes.notModified).toBe(true);
		expect(conditionalStreamRes.body).toEqual(new Uint8Array());
	});

	it("keeps every file's metadata when uploads happen at the same time", async () => {
		const options = {
			uploadDir,
			secretKey: "secret",
		};
		const keys = Array.from({ length: 20 }, (_, index) => `public/${index}`);

		await Promise.all(
			keys.map((key) =>
				uploadSingle(options)({} as never, {
					key,
					body: Buffer.from("plain text"),
					mimeType: "text/plain",
					extension: "txt",
					size: 10,
					type: "document",
				}),
			),
		);
		const metadata = await Promise.all(
			keys.map((key) => getMetadata(options)({} as never, { key })),
		);

		expect(metadata.map((meta) => meta.mimeType)).toEqual(
			keys.map(() => "text/plain"),
		);
	});

	it("moves stored mime metadata when a key is renamed", async () => {
		const options = {
			uploadDir,
			secretKey: "secret",
		};

		await uploadSingle(options)({} as never, {
			key: "public/source",
			body: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
			mimeType: "image/svg+xml",
			extension: "svg",
			size: 46,
			type: "image",
		});

		await rename(options)({} as never, {
			from: "public/source",
			to: "private/source",
		});

		const streamRes = await stream(options)({} as never, {
			key: "private/source",
		});
		expect(streamRes.contentType).toBe("image/svg+xml");
		expect(streamRes.etag).toBeTruthy();
	});
});
