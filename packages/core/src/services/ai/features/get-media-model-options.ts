import { copy } from "../../../libs/i18n/index.js";
import type {
	MediaGenerationType,
	MediaModelCatalog,
} from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkFeatureEnabled from "../checks/check-feature-enabled.js";
import getMediaModelCatalog from "../helpers/get-media-model-catalog.js";

/**
 * Filters Lucid's model catalogue by configured availability and resolves the default.
 * @remarks Uses the first offered match among the configured default, configured available models and Lucid's default, then the first offered model.
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
	const models = catalog.data.models.filter(
		(model) => !options.available || options.available.includes(model.id),
	);
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
