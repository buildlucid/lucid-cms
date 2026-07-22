import type { Insert, LucidRoleTranslations } from "../../../libs/db/types.js";
import type { AdminCopyInput, Translator } from "../../../libs/i18n/types.js";
import type { Config } from "../../../types/config.js";
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
	value: AdminCopyInput | undefined,
	config: Pick<Config, "i18n">,
	translate: Translator,
): RoleTranslationInput => {
	if (value === undefined) return [];

	return config.i18n.locales.map((locale) => {
		return {
			localeCode: locale.code,
			value: translate.forLocale(locale.code)(value) ?? null,
		};
	});
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
