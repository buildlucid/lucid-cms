const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value);
};

type NormalizeCurrentValueTranslationsProps = {
	currentValue: unknown;
	localeCodes: string[];
	targetLocale: string;
};

/**
 * Normalizes raw or localized field input into a locale keyed translation record.
 */
const normalizeCurrentValueTranslations = (
	props: NormalizeCurrentValueTranslationsProps,
) => {
	if (props.currentValue === undefined) return undefined;

	if (
		isRecord(props.currentValue) &&
		Object.keys(props.currentValue).some((key) =>
			props.localeCodes.includes(key),
		)
	) {
		return props.currentValue;
	}

	return {
		[props.targetLocale]: props.currentValue,
	};
};

export default normalizeCurrentValueTranslations;
