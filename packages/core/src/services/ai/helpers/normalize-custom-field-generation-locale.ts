/** Shared fields produce one value, with an optional language hint. */
const normalizeCustomFieldGenerationLocale = (props: {
	defaultLocale: string | null;
	fieldIsLocalized: boolean;
	locale: { source?: string; target: string[] | null };
	value: unknown;
}) => ({
	locale: props.fieldIsLocalized
		? {
				...props.locale,
				target:
					props.locale.target ??
					(props.defaultLocale ? [props.defaultLocale] : null),
			}
		: {
				source: props.locale.source ?? props.defaultLocale ?? undefined,
				target: null,
			},
	value: props.value,
});

export default normalizeCustomFieldGenerationLocale;
