import type { CollectionOptions } from "@lucidcms/core/types";
/** A publishing target used by redirect documents. */
export type RedirectTarget = NonNullable<
	NonNullable<CollectionOptions<"redirects">["publishing"]>["targets"]
>[number];

export interface RedirectsPluginOptions {
	/** Collections available as redirect destinations. */
	collections: string[];
	/** Publishing targets. Inferred when all target collections match. */
	targets?: RedirectTarget[];
	/** Admin navigation group key. Defaults to `redirects`. */
	navigationGroup?: string;
}

export type RedirectsPluginOptionsInternal = {
	collections: string[];
	targets: RedirectTarget[];
	navigationGroup?: string;
	locales: Array<{
		code: string;
		label: string;
	}>;
	defaultLocale: string;
};
