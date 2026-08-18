import type { CollectionConfigSchemaType } from "@lucidcms/core/types";

/** A publishing environment used by redirect documents. */
export type RedirectEnvironment = NonNullable<
	CollectionConfigSchemaType<"redirects">["environments"]
>[number];

export interface RedirectsPluginOptions {
	/** Collections available as redirect destinations. */
	collections: string[];
	/** Publishing environments. Inferred when all target collections match. */
	environments?: RedirectEnvironment[];
	/** Admin navigation group key. Defaults to `redirects`. */
	navigationGroup?: string;
}

export type RedirectsPluginOptionsInternal = {
	collections: string[];
	environments: RedirectEnvironment[];
	navigationGroup?: string;
	locales: Array<{ code: string; label: string }>;
	defaultLocale: string;
};
