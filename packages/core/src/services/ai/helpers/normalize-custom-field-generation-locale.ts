/**
 * Keeps AI generation input in one locale when the target field is not localized.
 * The remote AI API still expects locale-shaped data, so we collapse to the default locale.
 */
const normalizeCustomFieldGenerationLocale = (props: {
	defaultLocale: string;
	fieldIsLocalized: boolean;
	locale: {
		source?: string;
		target: string[];
	};
	value: Record<string, unknown>;
}) => {
	if (props.fieldIsLocalized) {
		return {
			locale: props.locale,
			value: props.value,
		};
	}

	if (Object.hasOwn(props.value, props.defaultLocale)) {
		return {
			locale: {
				source: props.defaultLocale,
				target: [props.defaultLocale],
			},
			value: {
				[props.defaultLocale]: props.value[props.defaultLocale],
			},
		};
	}

	const fallbackValue = Object.values(props.value)[0];

	return {
		locale: {
			source: props.defaultLocale,
			target: [props.defaultLocale],
		},
		value:
			fallbackValue === undefined
				? {}
				: {
						[props.defaultLocale]: fallbackValue,
					},
	};
};

export default normalizeCustomFieldGenerationLocale;
