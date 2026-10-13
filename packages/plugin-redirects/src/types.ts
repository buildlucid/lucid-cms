import type { CollectionEnvironmentOptions } from "@lucidcms/core/types";
/** An environment used by redirect documents. */
export type RedirectEnvironment = CollectionEnvironmentOptions;

export interface RedirectsPluginOptions {
	/** Collections available as redirect destinations. */
	collections: string[];
	/** Redirect environments, inferred when all target collections match. */
	environments?: RedirectEnvironment[];
	/** Admin navigation group key. Defaults to `redirects`. */
	navigationGroup?: string;
}

export type RedirectsPluginOptionsInternal = {
	collections: string[];
	environments: RedirectEnvironment[];
	navigationGroup?: string;
	locales: Array<{
		code: string;
		label: string;
	}>;
	defaultLocale: string | null;
};
