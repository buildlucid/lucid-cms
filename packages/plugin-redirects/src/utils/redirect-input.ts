import type { FieldInputSchema } from "@lucidcms/core/types";
import { fields, targetTypes } from "../constants.js";

export type RedirectIdentity = {
	from: string;
	locale: string;
	targetType: "document" | "url";
	targetUrl: string | null;
};

const fieldValue = (input: FieldInputSchema[] | undefined, key: string) =>
	input?.find((field) => field.key === key)?.value;

/** Reads the non-localized values needed for redirect integrity checks. */
export const getRedirectIdentity = (props: {
	fields?: FieldInputSchema[];
	defaultLocale: string;
	hasLocaleField: boolean;
}): RedirectIdentity | null => {
	const fromValue = fieldValue(props.fields, fields.from);
	const targetTypeValue = fieldValue(props.fields, fields.targetType);
	const localeValue = props.hasLocaleField
		? fieldValue(props.fields, fields.locale)
		: props.defaultLocale;

	if (
		typeof fromValue !== "string" ||
		fromValue.trim().length === 0 ||
		(targetTypeValue !== targetTypes.document &&
			targetTypeValue !== targetTypes.url) ||
		typeof localeValue !== "string" ||
		localeValue.length === 0
	) {
		return null;
	}

	const targetUrlValue = fieldValue(props.fields, fields.targetUrl);

	return {
		from: fromValue.trim(),
		locale: localeValue,
		targetType: targetTypeValue,
		targetUrl:
			targetTypeValue === targetTypes.url && typeof targetUrlValue === "string"
				? targetUrlValue.trim()
				: null,
	};
};

export const isDirectSelfRedirect = (identity: RedirectIdentity) =>
	identity.targetType === targetTypes.url &&
	identity.targetUrl !== null &&
	identity.from === identity.targetUrl;
