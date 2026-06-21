import {
	copy,
	getFileMetadata,
	resolveMediaKeyTenant,
} from "@lucidcms/core/plugin";
import type { ServiceFn } from "@lucidcms/core/types";
import { FILE_SYSTEM_UPLOAD_PATH } from "../constants.js";
import {
	checkFileSystemMediaAdapter,
	validatePresignedToken,
} from "./checks/index.js";

const uploadSingle: ServiceFn<
	[
		{
			buffer: Buffer | undefined | null;
			key: string;
			mimeType: string;
			extension?: string;
			token: string;
			timestamp: string;
		},
	],
	boolean
> = async (context, data) => {
	const mediaAdapterRes = await checkFileSystemMediaAdapter(context, {
		name: copy("server:plugin.filesystem.media.routes.upload.error.name"),
		message: copy("server:plugin.filesystem.media.routes.upload.error.message"),
	});
	if (mediaAdapterRes.error) return mediaAdapterRes;

	const adapterOptions = mediaAdapterRes.data.getOptions?.();
	const checkPresignedTokenRes = await validatePresignedToken(context, {
		key: data.key,
		token: data.token,
		timestamp: data.timestamp,
		path: FILE_SYSTEM_UPLOAD_PATH,
		secretKey: adapterOptions?.secretKey ?? context.config.secrets.cookie,
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
				message: copy("server:plugin.filesystem.media.files.invalid"),
			},
		};
	}

	const fileMetadataRes = await getFileMetadata({
		mimeType: data.mimeType,
		fileName: data.extension ? `upload.${data.extension}` : "upload",
	});
	if (fileMetadataRes.error) return fileMetadataRes;

	const uploadRes = await mediaAdapterRes.data.upload(context, {
		key: data.key,
		body: data.buffer,
		mimeType: fileMetadataRes.data.mimeType,
		extension: fileMetadataRes.data.extension,
		size: data.buffer.length,
		type: fileMetadataRes.data.type,
		tenant: resolveMediaKeyTenant(context.config, data.key),
	});
	if (uploadRes.error) return uploadRes;

	return {
		error: undefined,
		data: true,
	};
};

export default uploadSingle;
