import type { ResolvedAdminCopy } from "@types";
import T, { getDirection, getLocale, translateAdminCopy } from "@/translations";
import type coreCopy from "@/translations/en.json";

type StripScope<Key> = Key extends `admin:${infer Name}` ? Name : never;
export type TranslationKey =
	| keyof typeof coreCopy
	| StripScope<keyof LucidCMS.CopyTranslationKeys>;
export type TranslationValues = Record<string, string | number | undefined>;

/**
 * Translates text into the user's interface language.
 *
 * @example
 * ```tsx
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return <p>{t("redirects.count", { count: total() })}</p>;
 * ```
 */
export const useTranslation = () => ({
	t: (key: TranslationKey, values?: TranslationValues) => T()(key, values),
	copy: (value: ResolvedAdminCopy) => translateAdminCopy(value),
	locale: getLocale,
	direction: getDirection,
});

/** Registers a plugin's translation keys, so `t` accepts them. */
export type TranslationRegistry<Messages extends Record<string, string>> =
	Record<`admin:${Extract<keyof Messages, string>}`, true>;
