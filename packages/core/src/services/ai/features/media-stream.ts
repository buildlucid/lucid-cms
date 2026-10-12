import { mediaGenerationFeatures } from "../../../libs/config/ai-features.js";
import { copy } from "../../../libs/i18n/index.js";
import getGeneratedMedia, {
	type GeneratedMedia,
} from "../../../libs/lucid-remote/services/get-generated-media/index.js";
import hasAccess from "../../../libs/permission/has-access.js";
import type { LucidUser } from "../../../types/hono.js";
import type { MediaGenerationType } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import handleProtectedResourceUnauthorized from "../../connection/helpers/handle-protected-resource-unauthorized.js";
import getAccessToken from "../../connection/token-manager.js";
import checkFeatureEnabled from "../checks/check-feature-enabled.js";

/**
 * Proxies generated media for admin previews using the connection token.
 * @remarks Requires the media type's AI feature and generation permission.
 */
const mediaStream: ServiceFn<
	[
		{
			storageKey: string;
			range?: string;
			signal?: AbortSignal;
			user: LucidUser;
		},
	],
	GeneratedMedia
> = async (context, props) => {
	//* Treat MP3 and WAV storage keys as audio when checking feature access.
	const type: MediaGenerationType = /\.(mp3|wav)$/.test(props.storageKey)
		? "audio"
		: "image";

	const featureEnabledRes = await checkFeatureEnabled(context, {
		feature: `${type}Generation`,
	});
	if (featureEnabledRes.error) return featureEnabledRes;

	if (
		!hasAccess({
			user: props.user,
			requiredPermissions: [mediaGenerationFeatures[type].permission],
		})
	) {
		return {
			error: {
				type: "basic",
				status: 403,
				name: copy("server:core.permissions.error.name"),
				message: copy("server:core.permissions.denied"),
			},
			data: undefined,
		};
	}

	const accessTokenRes = await getAccessToken(context, {});
	if (accessTokenRes.error) return accessTokenRes;

	const mediaRes = await getGeneratedMedia(context, {
		accessToken: accessTokenRes.data.accessToken,
		storageKey: props.storageKey,
		range: props.range,
		signal: props.signal,
	});
	if (mediaRes.error?.status === 401) {
		await handleProtectedResourceUnauthorized(context);
	}

	return mediaRes;
};

export default mediaStream;
