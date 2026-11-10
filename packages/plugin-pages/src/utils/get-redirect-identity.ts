import type { FieldInputSchema } from "@lucidcms/core/types";
import { redirectFields, redirectTargetTypes } from "../constants.js";
import type { RedirectIdentity } from "../types/types.js";

/** Reads the non-localized values a redirect's integrity checks need from its submitted fields. */
const getRedirectIdentity = (props: {
	fields?: FieldInputSchema[];
	defaultLocale: string | null;
	hasLocaleField: boolean;
}): RedirectIdentity | null => {
	const fieldValue = (key: string) =>
		props.fields?.find((field) => field.key === key)?.value;

	const fromValue = fieldValue(redirectFields.from);
	const targetTypeValue = fieldValue(redirectFields.targetType);
	const localeValue = props.hasLocaleField
		? fieldValue(redirectFields.locale)
		: props.defaultLocale;

	if (
		typeof fromValue !== "string" ||
		fromValue.trim().length === 0 ||
		(targetTypeValue !== redirectTargetTypes.document &&
			targetTypeValue !== redirectTargetTypes.url) ||
		(localeValue !== null &&
			(typeof localeValue !== "string" || localeValue.length === 0))
	) {
		return null;
	}

	const targetUrlValue = fieldValue(redirectFields.targetUrl);

	return {
		from: fromValue.trim(),
		locale: localeValue,
		targetType: targetTypeValue,
		targetUrl:
			targetTypeValue === redirectTargetTypes.url &&
			typeof targetUrlValue === "string"
				? targetUrlValue.trim()
				: null,
	};
};

export default getRedirectIdentity;
