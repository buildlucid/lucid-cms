import type { Insert, LucidRoleTranslations } from "../../../libs/db/types.js";
import type { ConfiguredLocaleValue } from "../../../types/config.js";
import type { TranslationsObj } from "../../../types/shared.js";

export type RoleTranslationInput = TranslationsObj[];

/**
 * Reads a specific configured-locale role translation value from normalized input.
 */
export const getTranslationValue = (
	translations: RoleTranslationInput | undefined,
	localeCode: string,
) => {
	return translations?.find(
		(translation) => translation.localeCode === localeCode,
	)?.value;
};

/**
 * Converts config role copy into the same translation array shape used by the role APIs.
 */
export const normalizeTranslationArray = (
	value: ConfiguredLocaleValue | undefined,
	defaultLocale: string,
): RoleTranslationInput => {
	if (value === undefined) return [];
	if (typeof value === "string") {
		return [
			{
				localeCode: defaultLocale,
				value,
			},
		];
	}

	return Object.entries(value)
		.filter((entry): entry is [string, string] => entry[1] !== undefined)
		.map(([localeCode, translation]) => ({
			localeCode,
			value: translation,
		}));
};

/**
 * Finds every configured locale represented across role name and description translations.
 */
const collectLocales = (
	translations: Array<RoleTranslationInput | undefined>,
) => {
	const locales = new Set<string>();
	for (const translationGroup of translations) {
		for (const translation of translationGroup ?? []) {
			if (translation.localeCode !== null) locales.add(translation.localeCode);
		}
	}
	return locales;
};

/**
 * Builds role translation rows so config sync and API writes share the same persistence shape.
 */
export const prepareRoleTranslations = (props: {
	name?: RoleTranslationInput;
	description?: RoleTranslationInput;
	roleId: number;
}): Array<Omit<Insert<LucidRoleTranslations>, "id">> => {
	const locales = collectLocales([props.name, props.description]);

	return Array.from(locales).map((localeCode) => ({
		role_id: props.roleId,
		locale_code: localeCode,
		name: getTranslationValue(props.name, localeCode) ?? null,
		description: getTranslationValue(props.description, localeCode) ?? null,
	}));
};
