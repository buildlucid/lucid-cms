export type CollectionPrefix = string | Record<string, string>;

export interface PluginOptions {
	collections: Array<{
		collectionKey: string;
		useTranslations?: boolean;
		displayFullSlug?: boolean;
		prefix?: CollectionPrefix;
		// fallbackSlugSource?: string;
	}>;
}

export interface PluginOptionsInternal extends PluginOptions {
	collections: Array<CollectionConfig>;
}

export interface CollectionConfig {
	collectionKey: string;
	useTranslations: boolean;
	displayFullSlug: boolean;
	prefix?: CollectionPrefix;
	// fallbackSlugSource: string | undefined;
}
