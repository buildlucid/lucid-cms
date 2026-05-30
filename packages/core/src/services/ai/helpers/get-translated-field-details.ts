import type { ServiceContext } from "../../../utils/services/types.js";

type FieldDetails = {
	label?: Parameters<ServiceContext["translate"]>[0];
	summary?: Parameters<ServiceContext["translate"]>[0];
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
	const summary = translate(targetField.details.summary);

	if (!label && !summary) return undefined;

	return {
		...(label ? { label } : {}),
		...(summary ? { summary } : {}),
	};
};

export default getTranslatedFieldDetails;
