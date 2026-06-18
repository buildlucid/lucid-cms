/**
 * Text direction for a configured locale.
 */
export type LocaleDirection = "ltr" | "rtl";

/**
 * Direction used by the admin interface for the active interface locale.
 */
export type InterfaceDirection = LocaleDirection;

/**
 * Translation namespace. Admin copy is used by the CMS UI; server copy is used
 * by API responses, services, jobs, and plugins.
 */
export type TranslationScope = "admin" | "server";

/**
 * Interpolation values for `{{placeholder}}` tokens in translation strings.
 */
export type TranslationValues = Record<string, string | number | undefined>;

declare global {
	/**
	 * Project-specific Lucid type registries populated by generated `.lucid`
	 * types.
	 */
	namespace LucidCMS {
		/**
		 * Translation keys available to `copy`. Lucid augments this during
		 * typegen from the project's `translations/` directory.
		 */
		interface CopyTranslationKeys {}
	}
}

/**
 * Generated project translation keys that can be passed to `copy`.
 */
export type RegisteredCopyTranslationKey = Extract<
	keyof LucidCMS.CopyTranslationKeys,
	`admin:${string}` | `server:${string}`
>;

/**
 * A translation key plus optional interpolation data and fallback copy.
 *
 * Create these with `copy` rather than building the object by hand.
 */
export type CopyDescriptor<TScope extends TranslationScope = TranslationScope> =
	{
		type: "lucid.copy";
		scope: TScope;
		key: string;
		values?: TranslationValues;
		defaultMessage?: string;
	};

/**
 * Plain copy that can flow through APIs expecting translatable copy.
 */
export type LiteralCopy = {
	type: "lucid.literal";
	value: string;
	values?: TranslationValues;
};

/**
 * Admin-scoped copy descriptor.
 */
export type AdminCopyDescriptor = CopyDescriptor<"admin">;

/**
 * Server-scoped copy descriptor.
 */
export type ServerCopyDescriptor = CopyDescriptor<"server">;

/**
 * Any value Lucid can resolve with `translate`.
 */
export type TranslatableCopy = CopyDescriptor | LiteralCopy;

/**
 * Copy as authored in config: a plain string, a copy descriptor, or a literal.
 *
 * Strings are normalised into {@link LiteralCopy} via `normalizeCopy` before
 * they reach the runtime, so consumers only ever resolve descriptor/literal
 * objects.
 */
export type CopyInput = string | TranslatableCopy;

/**
 * Admin-scoped {@link CopyInput} for config positions that render admin UI copy.
 */
export type AdminCopyInput = string | AdminCopyDescriptor | LiteralCopy;

/**
 * Already-normalised admin copy as it appears in API responses (descriptor or
 * literal — never a bare string).
 */
export type ResolvedAdminCopy = AdminCopyDescriptor | LiteralCopy;

/**
 * Translation keys for each scope within one locale.
 */
export type TranslationBundle = Record<
	TranslationScope,
	Record<string, string>
>;

/**
 * Translation bundles keyed by locale code.
 */
export type TranslationBundles = Record<string, TranslationBundle>;

/**
 * A source for translation files. Relative/absolute paths, file URLs, and
 * package subpath specifiers are supported. Directories are scanned for
 * `<locale>.admin.json` and `<locale>.server.json`; files must use the same
 * naming convention.
 */
export type TranslationSource = string | URL;

/**
 * Options for resolving a translation key.
 */
export type TranslateOptions = {
	data?: TranslationValues;
	locale?: string;
	defaultMessage?: string;
};

/**
 * Options for resolving a descriptor or literal.
 */
export type TranslateCopyOptions = TranslateOptions;

/**
 * Translation options for a translator that already knows its locale.
 */
export type BoundTranslateOptions = Omit<TranslateOptions, "locale">;

/**
 * Function signature for resolving a single admin/server key.
 */
export type TranslateKey = (
	key: string,
	options?: BoundTranslateOptions,
) => string;

/**
 * Descriptor translation options for a translator that already knows its
 * locale.
 */
export type BoundTranslateCopyOptions = BoundTranslateOptions;

/**
 * Function signature for resolving a prefixed copy key, descriptor, or literal.
 */
export type TranslateCopy = {
	(
		value: string | TranslatableCopy,
		options?: BoundTranslateCopyOptions,
	): string;
	(value: undefined, options?: BoundTranslateCopyOptions): undefined;
	(
		value: string | TranslatableCopy | undefined,
		options?: BoundTranslateCopyOptions,
	): string | undefined;
};

/**
 * Runtime owner for resolved translation bundles.
 */
export type TranslationStore = {
	defaultLocale: string;
	bundles: TranslationBundles;
	resolve: (props: {
		scope: TranslationScope;
		key: string;
		locale?: string;
		options?: BoundTranslateOptions;
	}) => string;
	copy: (
		value: string | TranslatableCopy | undefined,
		props?: {
			locale?: string;
			options?: BoundTranslateCopyOptions;
		},
	) => string | undefined;
	admin: (props: { locale: string }) => Record<string, string>;
};

/**
 * Locale-bound translator for project, plugin, and core translations.
 */
export type Translator = TranslateCopy & {
	/**
	 * Locale used by the translator.
	 */
	locale: string;
	/**
	 * Creates a translator for another locale using the same translation store.
	 */
	forLocale: (locale: string) => Translator;
	/**
	 * Returns the full admin translation bundle for the bound locale.
	 */
	adminBundle: () => Record<string, string>;
	/**
	 * English translator helpers for persisted operational messages and
	 * non-request runtimes.
	 */
	english: TranslateCopy;
};
