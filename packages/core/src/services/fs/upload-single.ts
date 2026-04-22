import { FILE_SYSTEM_UPLOAD_PATH } from "../../libs/media-adapter/adapters/file-system/helpers.js";
import type { FileSystemMediaAdapterOptions } from "../../libs/media-adapter/types.js";
import T from "../../translations/index.js";
import { getFileMetadata } from "../../utils/media/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices } from "../index.js";
import { validatePresignedToken } from "./checks/index.js";

const uploadSingle: ServiceFn<
	[
		{
			buffer: Buffer | undefined | null;
			key: string;
			mimeType: string;
			extension?: string;
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
		path: FILE_SYSTEM_UPLOAD_PATH,
		secretKey:
			data.mediaAdapterOptions?.secretKey ?? context.config.secrets.cookie,
		query: {
			mimeType: data.mimeType,
			extension: data.extension,
		},
	});
	if (checkPresignedTokenRes.error) return checkPresignedTokenRes;
	if (!Buffer.isBuffer(data.buffer)) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: T("invalid_file"),
			},
		};
	}

	const fileMetadataRes = await getFileMetadata({
		mimeType: data.mimeType,
		fileName: data.extension ? `upload.${data.extension}` : "upload",
	});
	if (fileMetadataRes.error) return fileMetadataRes;

	const mediaStrategyRes =
		await mediaServices.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const uploadRes = await mediaStrategyRes.data.upload({
		key: data.key,
		data: data.buffer,
		meta: {
			mimeType: fileMetadataRes.data.mimeType,
			extension: fileMetadataRes.data.extension,
			size: data.buffer.length,
			type: fileMetadataRes.data.type,
		},
	});
	if (uploadRes.error) return uploadRes;

	return {
		error: undefined,
		data: true,
	};
};

export default uploadSingle;
