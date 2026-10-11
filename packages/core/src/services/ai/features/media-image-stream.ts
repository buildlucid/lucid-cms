import getGeneratedImage, {
	type GeneratedImage,
} from "../../../libs/lucid-remote/services/get-generated-image/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import handleProtectedResourceUnauthorized from "../../connection/helpers/handle-protected-resource-unauthorized.js";
import getAccessToken from "../../connection/token-manager.js";
import checkFeatureEnabled from "../checks/check-feature-enabled.js";

/** Proxies generated images using the connection's access token for admin previews and downloads. */
const mediaImageStream: ServiceFn<
	[{ storageKey: string; signal?: AbortSignal }],
	GeneratedImage
> = async (context, props) => {
	const featureEnabledRes = await checkFeatureEnabled(context, {
		feature: "imageGeneration",
	});
	if (featureEnabledRes.error) return featureEnabledRes;

	const accessTokenRes = await getAccessToken(context, {});
	if (accessTokenRes.error) return accessTokenRes;

	const imageRes = await getGeneratedImage(context, {
		accessToken: accessTokenRes.data.accessToken,
		storageKey: props.storageKey,
		signal: props.signal,
	});
	if (imageRes.error?.status === 401) {
		await handleProtectedResourceUnauthorized(context);
	}

	return imageRes;
};

export default mediaImageStream;
