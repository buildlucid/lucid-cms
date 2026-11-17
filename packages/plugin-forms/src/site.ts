import { defineSiteFunction, type SiteExtension } from "@lucidcms/site";
import { safe } from "@lucidkiln/core";
import { FORMS_COLLECTION_KEY } from "./constants.js";
import type { RenderFormOptions } from "./shared/render-form.js";

/** How `form()` draws forms: markup of your own for fields, extra attributes, and the script. */
export type FormsSiteOptions = Pick<
	RenderFormOptions,
	"fields" | "attributes" | "script"
>;

/**
 * Draws a form by its key in the page's locale and the site's environment: `{{ form("contact") }}`.
 * Empty when no form has the key.
 */
const createFormFunction = (options: FormsSiteOptions) =>
	defineSiteFunction(async ({ toolkit, locale, version }, key: string) => {
		const html = await toolkit.forms?.render(
			{
				key,
				locale,
				//* the site's own environment for forms, or the plugin's default when it leaves forms out
				version: version(FORMS_COLLECTION_KEY) ?? undefined,
			},
			options,
		);
		return html?.data ? safe(html.data) : "";
	});

declare module "@lucidkiln/core" {
	interface KilnFunctions {
		form: ReturnType<typeof createFormFunction>;
	}
}

/**
 * Adds the `form()` template function to the site plugin. Pass it to the site plugin's
 * `kiln.extensions`.
 *
 * @example
 * ```ts
 * site({ kiln: { extensions: [formsSite()] } });
 * ```
 */
export const formsSite = (options: FormsSiteOptions = {}): SiteExtension => ({
	name: "forms",
	functions: { form: createFormFunction(options) },
});
