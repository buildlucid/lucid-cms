import { copy } from "../../../libs/i18n/index.js";
import getGeneratedMedia from "../../../libs/lucid-remote/services/get-generated-media/index.js";
import readBoundedBody from "../../../libs/media-storage/read-bounded-body.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import handleRemoteError from "../../connection/helpers/handle-remote-error.js";
import getAccessToken from "../../connection/token-manager.js";

/**
 * Downloads generated media within the CMS upload limit.
 * @remarks Token and remote download failures use 424, oversized files use 413, and aborted reads use 499.
 */
const downloadGeneratedMedia: ServiceFn<
	[{ storageKey: string; signal: AbortSignal }],
	Buffer
> = async (context, props) => {
	const token = await getAccessToken(context, {});
	if (token.error) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 424,
				message: copy("server:agent.media.generate.download.failed"),
			},
		};
	}

	const media = await getGeneratedMedia(context, {
		accessToken: token.data.accessToken,
		storageKey: props.storageKey,
		signal: props.signal,
	});
	if (media.error) {
		await handleRemoteError(context, media.error);
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 424,
				message: copy("server:agent.media.generate.download.failed"),
			},
		};
	}

	const body = await readBoundedBody(media.data.body, {
		maxBytes: context.config.media.limits.uploadBytes,
		signal: props.signal,
	});
	if (body.type === "too-large") {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 413,
				message: copy("server:agent.media.generate.too.large"),
			},
		};
	}
	if (body.type === "aborted") {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 499,
				message: copy("server:agent.media.generate.download.failed"),
			},
		};
	}

	return { error: undefined, data: body.bytes };
};

export default downloadGeneratedMedia;
