import { copy } from "@lucidcms/core";
import { getFileMetadata, readBoundedBody } from "@lucidcms/core/extension";
import type { ServiceFn } from "@lucidcms/core/types";
import { FILE_SYSTEM_UPLOAD_PATH } from "../constants.js";
import {
	checkFileSystemStorageAdapter,
	validatePresignedToken,
} from "./checks/index.js";

/**
 * Stores a file sent to a signed upload URL. The token is checked before the body is read, and
 * the body is never read past the CMS's upload limit.
 */
const uploadSingle: ServiceFn<
	[
		{
			body: ReadableStream<Uint8Array> | null;
			/** Stops reading the body, such as when the request is cancelled. */
			signal: AbortSignal;
			key: string;
			mimeType: string;
			extension?: string;
			token: string;
			timestamp: string;
		},
	],
	boolean
> = async (context, data) => {
	const mediaStorageAdapterRes = await checkFileSystemStorageAdapter(context, {
		name: copy("server:plugin.filesystem.media.routes.upload.error.name"),
		message: copy("server:plugin.filesystem.media.routes.upload.error.message"),
	});
	if (mediaStorageAdapterRes.error) return mediaStorageAdapterRes;

	const adapterOptions = mediaStorageAdapterRes.data.getOptions?.();
	const checkPresignedTokenRes = await validatePresignedToken(context, {
		key: data.key,
		token: data.token,
		timestamp: data.timestamp,
		path: FILE_SYSTEM_UPLOAD_PATH,
		secretKey: adapterOptions?.secretKey ?? context.config.secrets.encryption,
		query: {
			mimeType: data.mimeType,
			extension: data.extension,
		},
	});
	if (checkPresignedTokenRes.error) return checkPresignedTokenRes;
	if (!data.body) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:plugin.filesystem.media.files.invalid"),
			},
		};
	}

	const maxBytes = context.config.media.limits.uploadBytes;
	const read = await readBoundedBody(data.body, {
		maxBytes,
		signal: data.signal,
	});
	if (read.type === "too-large") {
		return {
			error: {
				type: "basic",
				status: 413,
				message: copy("server:plugin.filesystem.media.files.too.large", {
					data: { size: maxBytes },
				}),
			},
		};
	}
	if (read.type === "aborted") {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:plugin.filesystem.media.files.invalid"),
			},
		};
	}
	const buffer = read.bytes;

	const fileMetadataRes = await getFileMetadata({
		mimeType: data.mimeType,
		fileName: data.extension ? `upload.${data.extension}` : "upload",
	});
	if (fileMetadataRes.error) return fileMetadataRes;

	const uploadRes = await mediaStorageAdapterRes.data.upload(context, {
		key: data.key,
		body: buffer,
		mimeType: fileMetadataRes.data.mimeType,
		extension: fileMetadataRes.data.extension,
		size: buffer.length,
		type: fileMetadataRes.data.type,
	});
	if (uploadRes.error) return uploadRes;

	return {
		error: undefined,
		data: true,
	};
};

export default uploadSingle;
