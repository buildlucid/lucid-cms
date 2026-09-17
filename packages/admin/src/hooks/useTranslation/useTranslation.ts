import type { ResolvedAdminCopy } from "@types";
import T, { getDirection, getLocale, translateAdminCopy } from "@/translations";
import type coreCopy from "@/translations/en.json";

type StripScope<Key> = Key extends `admin:${infer Name}` ? Name : never;
export type TranslationKey =
	| keyof typeof coreCopy
	| StripScope<keyof LucidCMS.CopyTranslationKeys>;
export type TranslationValues = Record<string, string | number | undefined>;

/**
 * Translates messages in the current interface language.
 *
 * @example
 * ```tsx
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return <button>{t("common.save")}</button>;
 * ```
 */
export const useTranslation = () => ({
	t: (key: TranslationKey, values?: TranslationValues) => T()(key, values),
	copy: (value: ResolvedAdminCopy) => translateAdminCopy(value),
	locale: getLocale,
	direction: getDirection,
});

/** Plugins can augment LucidCMS.CopyTranslationKeys from their own JSON source. */
export type TranslationRegistry<Messages extends Record<string, string>> =
	Record<`admin:${Extract<keyof Messages, string>}`, true>;
