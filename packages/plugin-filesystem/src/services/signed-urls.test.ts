import { validateSignedMediaUrl } from "@lucidcms/core/extension";
import type { ServiceContext } from "@lucidcms/core/types";
import { describe, expect, it, vi } from "vitest";
import {
	FILE_SYSTEM_DOWNLOAD_PATH,
	FILE_SYSTEM_UPLOAD_PATH,
} from "../constants.js";
import plugin from "../plugin.js";
import downloadSingle from "./download-single.js";
import uploadSingle from "./upload-single.js";

const readSignedUrl = (value: string) => {
	const query = new URL(value).searchParams;
	const key = query.get("key");
	const token = query.get("token");
	const timestamp = query.get("timestamp");
	if (!key || !token || !timestamp) throw new Error("Missing signed URL data");
	return { key, token, timestamp };
};

describe("filesystem signed URLs", () => {
	it.each([
		{ name: "the final encryption secret", secretKey: undefined },
		{ name: "an explicit plugin secret", secretKey: "plugin-secret" },
	])("signs and verifies uploads and downloads with $name", async ({
		secretKey,
	}) => {
		const definition = plugin({ secretKey });
		const defaults = definition.defaults;
		if (
			!defaults ||
			typeof defaults === "function" ||
			!defaults.media?.storage
		) {
			throw new Error("Missing filesystem adapter defaults");
		}
		const storage = await (typeof defaults.media.storage === "function"
			? defaults.media.storage()
			: defaults.media.storage);
		const body = Buffer.from("signed media");
		const stream = vi.fn<typeof storage.stream>(async () => ({
			error: undefined,
			data: { body, contentLength: body.length, contentType: "text/plain" },
		}));
		const upload = vi.fn<typeof storage.upload>(async () => ({
			error: undefined,
			data: { etag: "uploaded" },
		}));
		// These services only use config secrets and the media storage adapter.
		const context = {
			config: {
				secrets: {
					encryption: "final-encryption-secret",
					cookie: "cookie-secret",
				},
			},
			mediaStorage: { ...storage, stream, upload },
		} as unknown as ServiceContext;
		const expectedSecret = secretKey ?? context.config.secrets.encryption;
		const params = {
			host: "https://cms.example.com",
			key: "public/file.txt",
			secretKey: context.config.secrets.encryption,
			fileName: "file.txt",
			extension: "txt",
		};

		const download = await storage.getDownloadUrl(context, params);
		if (download.error) throw new Error("Could not sign download URL");
		const downloadData = readSignedUrl(download.data.url);
		expect(
			validateSignedMediaUrl({
				...downloadData,
				path: FILE_SYSTEM_DOWNLOAD_PATH,
				secretKey: expectedSecret,
				query: { fileName: params.fileName, extension: params.extension },
			}),
		).toBe(true);
		const downloaded = await downloadSingle(context, {
			...downloadData,
			fileName: params.fileName,
			extension: params.extension,
		});
		expect(downloaded.error).toBeUndefined();
		expect(downloaded.data?.body).toBe(body);
		expect(stream).toHaveBeenCalledOnce();

		const session = await storage.createUploadSession(context, {
			...params,
			mimeType: "text/plain",
			size: body.length,
		});
		if (session.error || session.data.protocol !== "http") {
			throw new Error("Could not create signed upload session");
		}
		const uploadData = readSignedUrl(session.data.request.url);
		expect(
			validateSignedMediaUrl({
				...uploadData,
				path: FILE_SYSTEM_UPLOAD_PATH,
				secretKey: expectedSecret,
				query: { mimeType: "text/plain", extension: params.extension },
			}),
		).toBe(true);
		const uploaded = await uploadSingle(context, {
			...uploadData,
			buffer: body,
			mimeType: "text/plain",
			extension: params.extension,
		});
		expect(uploaded.error).toBeUndefined();
		expect(uploaded.data).toBe(true);
		expect(upload).toHaveBeenCalledOnce();
	});
});
