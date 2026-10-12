import constants from "../../../constants/constants.js";
import { copy } from "../../../libs/i18n/index.js";
import logger from "../../../libs/logger/index.js";
import type {
	MediaGenerationType,
	MediaModelCatalog,
} from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkFeatureEnabled from "../checks/check-feature-enabled.js";
import getMediaModelCatalog from "../helpers/get-media-model-catalog.js";

/**
 * Filters Lucid's model catalogue by configured availability and resolves the default.
 * @remarks Uses the full catalogue if no configured model remains available.
 * Default preference is the configured default, configured available models, Lucid's default, then the first offered model.
 */
const getMediaModelOptions: ServiceFn<
	[{ type: MediaGenerationType }],
	MediaModelCatalog<MediaGenerationType>
> = async (context, props) => {
	const featureEnabledRes = await checkFeatureEnabled(context, {
		feature: `${props.type}Generation`,
	});
	if (featureEnabledRes.error) return featureEnabledRes;

	const catalog = await getMediaModelCatalog(context, { type: props.type });
	if (catalog.error) return catalog;

	const options = context.config.ai.mediaGeneration[props.type].models;
	const configured = catalog.data.models.filter((model) =>
		options.available?.includes(model.id),
	);
	if (options.available?.length && configured.length === 0) {
		logger.warn({
			message: `ai.mediaGeneration.${props.type}.models.available matches none of the ${props.type} models the Lucid service offers. Every offered model is used instead.`,
			scope: constants.logScopes.ai,
		});
	}
	const models = configured.length > 0 ? configured : catalog.data.models;
	const preferred = [
		options.default,
		...(options.available ?? []),
		catalog.data.default,
	].find((modelId) => models.some((model) => model.id === modelId));
	const defaultModel = preferred ?? models[0]?.id;
	if (!defaultModel) {
		return {
			error: {
				type: "basic",
				status: 503,
				name: copy("server:core.ai.config.feature.disabled.name"),
				message: copy("server:core.ai.models.not.configured", {
					data: { type: props.type },
				}),
			},
			data: undefined,
		};
	}

	return { error: undefined, data: { default: defaultModel, models } };
};

export default getMediaModelOptions;
