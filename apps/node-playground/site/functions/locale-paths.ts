import { defineSiteFunction, type SitePagePaths } from "@lucidcms/plugin-site";

/** Paths for pages under `pages/[locale]/`, one per site locale: `{% export paths = localePaths() %}`. */
const localePaths = defineSiteFunction(
	async ({ functions }): Promise<SitePagePaths> =>
		(await functions.locales()).map((locale) => ({ locale: locale.code })),
);

export default localePaths;
