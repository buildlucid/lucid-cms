import type { CollectionOptions } from "@lucidcms/core/types";
/** An environment used by redirect documents. */
export type RedirectEnvironment = NonNullable<
	NonNullable<CollectionOptions<"redirects">["publishing"]>["environments"]
>[number];

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
