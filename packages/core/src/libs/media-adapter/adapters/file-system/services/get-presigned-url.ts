import crypto from "node:crypto";
import type {
	FileSystemMediaAdapterOptions,
	MediaAdapterServiceGetPresignedUrl,
} from "../../../types.js";

export default (options: FileSystemMediaAdapterOptions) => {
	const getPresignedUrl: MediaAdapterServiceGetPresignedUrl = async (
		key,
		meta,
	) => {
		try {
			const timestamp = Date.now();
			const token = crypto
				.createHmac("sha256", options.secretKey)
				.update(`${key}${timestamp}`)
				.digest("hex");

			return {
				error: undefined,
				data: {
					url: `${meta.host}/api/v1/fs/upload?key=${key}&token=${token}&timestamp=${timestamp}`,
				},
			};
		} catch (e) {
			const error = e as Error;
			return {
				error: {
					message: error.message,
					status: 500,
				},
				data: undefined,
			};
		}
	};

	return getPresignedUrl;
};
