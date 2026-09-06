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
	const label = translate(targetField.details.label);
	const description = translate(targetField.details.description);
	if (!label && !description) return undefined;
	return {
		...(label ? { label } : {}),
		...(description ? { description } : {}),
	};
};

export default getTranslatedFieldDetails;
