import { mkdir, writeFile } from "node:fs/promises";
import type { ServiceFn } from "@lucidcms/core/types";
import constants from "../../constants/constants.js";
import { keyPaths } from "../../libs/media-adapter/adapters/file-system/helpers.js";
import type { FileSystemMediaAdapterOptions } from "../../libs/media-adapter/types.js";
import T from "../../translations/index.js";
import { validatePresignedToken } from "./checks/index.js";

const uploadSingle: ServiceFn<
	[
		{
			buffer: Buffer | undefined | null;
			key: string;
			token: string;
			timestamp: string;
			mediaAdapterOptions?: FileSystemMediaAdapterOptions;
		},
	],
	boolean
> = async (context, data) => {
	const checkPresignedTokenRes = await validatePresignedToken(context, {
		key: data.key,
		token: data.token,
		timestamp: data.timestamp,
		secretKey:
			data.mediaAdapterOptions?.secretKey ?? context.config.keys.cookieSecret,
	});
	if (checkPresignedTokenRes.error) return checkPresignedTokenRes;
	const { targetDir, targetPath } = keyPaths(
		data.key,
		data.mediaAdapterOptions?.uploadDir ?? constants.defaultUploadDirectory,
	);
	await mkdir(targetDir, { recursive: true });
	if (Buffer.isBuffer(data.buffer)) {
		await writeFile(targetPath, data.buffer);
	} else {
		return {
			error: {
				type: "basic",
				status: 400,
				message: T("invalid_file"),
			},
		};
	}
	return {
		error: undefined,
		data: true,
	};
};

export default uploadSingle;
