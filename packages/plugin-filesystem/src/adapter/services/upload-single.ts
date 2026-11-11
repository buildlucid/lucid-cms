import { createWriteStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { copy, LucidError } from "@lucidcms/core";
import type {
	FileSystemStorageAdapterOptions,
	MediaStorageAdapterServiceUploadSingle,
} from "@lucidcms/core/types";
import { createFileETag } from "../etag.js";
import { keyPaths } from "../helpers.js";
import { deleteStoredMetadata, writeStoredMetadata } from "../metadata.js";

export default (options: FileSystemStorageAdapterOptions) => {
	const uploadSingle: MediaStorageAdapterServiceUploadSingle = async (
		_context,
		props,
	) => {
		const { targetDir, targetPath } = keyPaths(props.key, options.uploadDir);

		const cleanup = async () => {
			await Promise.allSettled([
				rm(targetPath),
				deleteStoredMetadata(props.key),
			]);
		};

		try {
			await mkdir(targetDir, { recursive: true });
			if (props.body instanceof Uint8Array) {
				await writeFile(targetPath, props.body);
			} else {
				const writeStream = createWriteStream(targetPath);
				const readable =
					props.body instanceof Readable
						? props.body
						: Readable.fromWeb(props.body as never);

				await pipeline(readable, writeStream);
			}

			await writeStoredMetadata(props.key, {
				mimeType: props.mimeType,
				extension: props.extension,
			});

			//* the same ETag reads report, so a response sent while storing it stays valid
			return { etag: createFileETag(await stat(targetPath)) };
		} catch (e) {
			if (e instanceof LucidError) throw e;
			await cleanup();
			const error = e as Error;
			throw new LucidError({
				message: copy("server:plugin.filesystem.media.errors.default.message", {
					defaultMessage: error.message,
				}),
			});
		}
	};
	return uploadSingle;
};
