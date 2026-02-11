import crypto from "node:crypto";
import constants from "../../../../../constants/constants.js";
import type {
	FileSystemMediaAdapterOptions,
	MediaAdapterServiceGetDownloadUrl,
} from "../../../types.js";

export default (options: FileSystemMediaAdapterOptions) => {
	const getDownloadUrl: MediaAdapterServiceGetDownloadUrl = async (
		key,
		meta,
	) => {
		try {
			const timestamp = Date.now();
			const token = crypto
				.createHmac("sha256", options.secretKey)
				.update(`${key}${timestamp}`)
				.digest("hex");

			const query = new URLSearchParams({
				key,
				token,
				timestamp: String(timestamp),
			});

			return {
				error: undefined,
				data: {
					url: `${meta.host}/${constants.directories.base}/api/v1/fs/download?${query.toString()}`,
				},
			};
		} catch (e) {
			return {
				error: {
					message:
						e instanceof Error ? e.message : "Failed to sign download URL",
					status: 500,
				},
				data: undefined,
			};
		}
	};

	return getDownloadUrl;
};
