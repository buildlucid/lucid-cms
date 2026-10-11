import { copy } from "../../../../libs/i18n/index.js";
import getGeneratedImage from "../../../../libs/lucid-remote/services/get-generated-image/index.js";
import readBoundedBody from "../../../../libs/media-storage/read-bounded-body.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getAccessToken from "../../../connection/token-manager.js";

/** Downloads authenticated image bytes within the CMS upload limit. */
const downloadImage: ServiceFn<
	[{ storageKey: string; signal: AbortSignal }],
	Buffer
> = async (context, props) => {
	const token = await getAccessToken(context, {});
	//* A 424 status preserves the download failure message for the model.
	if (token.error) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 424,
				message: copy("server:agent.image.generate.download.failed"),
			},
		};
	}

	const image = await getGeneratedImage(context, {
		accessToken: token.data.accessToken,
		storageKey: props.storageKey,
		signal: props.signal,
	});
	if (image.error) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 424,
				message: copy("server:agent.image.generate.download.failed"),
			},
		};
	}

	const body = await readBoundedBody(image.data.body, {
		maxBytes: context.config.media.limits.uploadBytes,
		signal: props.signal,
	});
	if (body.type === "too-large") {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 413,
				message: copy("server:agent.image.generate.too.large"),
			},
		};
	}
	if (body.type === "aborted") {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 499,
				message: copy("server:agent.image.generate.download.failed"),
			},
		};
	}

	return { error: undefined, data: body.bytes };
};

export default downloadImage;
