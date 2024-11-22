export interface PluginOptions {
	collections: Array<{
		collectionKey: string;
		useTranslations?: boolean;
		displayFullSlug?: boolean;
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
	// fallbackSlugSource: string | undefined;
}
