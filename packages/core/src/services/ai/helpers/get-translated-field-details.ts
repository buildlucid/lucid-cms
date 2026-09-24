import { normalizeCopy } from "../../../libs/i18n/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";

type FieldDetails = {
	label?: Parameters<ServiceContext["translate"]>[0];
	description?: Parameters<ServiceContext["translate"]>[0];
};

const getTranslatedFieldDetails = (
	context: ServiceContext,
	targetField: {
		details: FieldDetails;
	},
) => {
	const translate = context.translate.forLocale(
		context.config.i18n.defaultLocale,
	);
	const label = translate(normalizeCopy(targetField.details.label));
	const description = translate(normalizeCopy(targetField.details.description));
	if (!label && !description) return undefined;
	return {
		...(label ? { label } : {}),
		...(description ? { description } : {}),
	};
};

export default getTranslatedFieldDetails;
