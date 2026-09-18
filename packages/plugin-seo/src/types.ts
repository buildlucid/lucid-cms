/** Registers an SEO fixed brick on existing collections. */
export interface SeoPluginOptions {
	collections: Array<{
		/** Existing collection key. */
		key: string;
		/** Follows collection localization by default. */
		localized?: boolean;
		/** Fixed brick key. Defaults to "seo". */
		brickKey?: string;
	}>;
}
