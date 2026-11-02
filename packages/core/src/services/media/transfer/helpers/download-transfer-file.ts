import constants from "../../../../constants/constants.js";
import { copy } from "../../../../libs/i18n/index.js";
import readBoundedBody from "../../../../libs/media-storage/read-bounded-body.js";
import type { ServiceFn } from "../../../../utils/services/types.js";

/**
 * Downloads an exported file from the site it was exported from, within this site's upload limit.
 * @remarks Uses the runtime's public fetch, which refuses private addresses and doesn't follow redirects.
 */
const downloadTransferFile: ServiceFn<[{ url: string }], Buffer> = async (
	context,
	data,
) => {
	const fetchPublic = context.runtimeContext?.fetchPublic;
	const url = URL.canParse(data.url) ? new URL(data.url) : undefined;
	if (
		fetchPublic &&
		(url?.protocol === "https:" || url?.protocol === "http:")
	) {
		const signal = AbortSignal.timeout(constants.transfer.downloadTimeout);
		try {
			const response = await fetchPublic(url, { signal });
			const body =
				response.ok && response.body
					? await readBoundedBody(response.body, {
							maxBytes: context.config.media.limits.uploadBytes,
							signal,
						})
					: undefined;
			if (body?.type === "too-large") {
				return {
					error: {
						status: 413,
						message: copy("server:core.transfer.media.too.large"),
					},
					data: undefined,
				};
			}
			if (body?.type === "complete") {
				return { error: undefined, data: body.bytes };
			}
		} catch {
			//* refused addresses and timeouts fail like any other download
		}
	}

	return {
		error: {
			status: 424,
			message: copy("server:core.transfer.media.download.failed"),
		},
		data: undefined,
	};
};

export default downloadTransferFile;
