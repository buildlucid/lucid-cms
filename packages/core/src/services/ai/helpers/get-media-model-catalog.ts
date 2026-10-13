import constants from "../../../constants/constants.js";
import cacheKeys from "../../../libs/kv/cache-keys.js";
import { mediaGenerationModelCatalogSchemas } from "../../../libs/lucid-remote/schema/ai.js";
import getMediaModels from "../../../libs/lucid-remote/services/get-media-models/index.js";
import type {
	MediaGenerationModelCatalog,
	MediaGenerationType,
} from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import handleRemoteError from "../../connection/helpers/handle-remote-error.js";
import getAccessToken from "../../connection/token-manager.js";

/** Reads a media type's hosted catalogue, cached briefly so the modal rarely waits on it. */
const getMediaModelCatalog: ServiceFn<
	[{ type: MediaGenerationType }],
	MediaGenerationModelCatalog<MediaGenerationType>
> = async (context, props) => {
	const key = cacheKeys.ai.mediaModels(props.type);
	const cached = mediaGenerationModelCatalogSchemas[props.type].safeParse(
		await context.kv.get(context, { key }),
	);
	if (cached.success) return { data: cached.data, error: undefined };

	const token = await getAccessToken(context, {});
	if (token.error) return token;
	const catalog = await getMediaModels(context, {
		accessToken: token.data.accessToken,
		type: props.type,
	});
	if (catalog.error) {
		await handleRemoteError(context, catalog.error);
		return catalog;
	}

	await context.kv.set(context, {
		key,
		value: catalog.data,
		ttlSeconds: constants.media.modelCatalogTtlSeconds,
	});

	return catalog;
};

export default getMediaModelCatalog;
