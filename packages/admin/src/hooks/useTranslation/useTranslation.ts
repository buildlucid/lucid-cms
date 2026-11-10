import type { ResolvedAdminCopy } from "@types";
import T, { getDirection, getLocale, translateAdminCopy } from "@/translations";
import type coreCopy from "@/translations/en.json";

type StripScope<Key> = Key extends `admin:${infer Name}` ? Name : never;
export type TranslationKey =
	| keyof typeof coreCopy
	| StripScope<keyof LucidCMS.TranslationKeys>;
/** Lucid's own keys that extensions may rely on. Its other keys can change between releases. */
type SharedTranslationKey = Extract<keyof typeof coreCopy, `common.${string}`>;
/** The keys an extension can translate: its own, and Lucid's shared `common.*` keys. */
export type ExtensionTranslationKey =
	| SharedTranslationKey
	| StripScope<keyof LucidCMS.TranslationKeys>;
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

/** `useTranslation` as extensions see it, with `t` limited to the keys they may rely on. */
export type UseExtensionTranslation = () => Omit<
	ReturnType<typeof useTranslation>,
	"t"
> & {
	t: (key: ExtensionTranslationKey, values?: TranslationValues) => string;
};
