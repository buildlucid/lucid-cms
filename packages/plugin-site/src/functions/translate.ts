import { logger } from "@lucidcms/core";
import { formatTranslation } from "@lucidcms/core/extension";
import type { TranslationValues, Translator } from "@lucidcms/core/types";
import { type RenderInfo, withRender } from "@lucidkiln/core";
import { PLUGIN_KEY } from "../constants.js";
import type { SiteConfig } from "../site/create-site-config.js";
import type { SiteState, SiteTranslationKey } from "../types.js";
import readLocale from "./read-locale.js";

export type TranslateOptions = {
	/** One of the site's locales, defaulting to the render's. */
	locale?: string;
	/** Text used when neither the locale nor the site's default locale has the key. */
	fallback?: string;
	/** Values for `{{name}}` placeholders, in the translation and the fallback. */
	data?: TranslationValues;
};

/** Translates a key from `<locale>.site.json` files: the locale, then the site's default locale, then `fallback`, then the key itself. */
const createTranslateFunction = (props: {
	config: SiteConfig;
	lookup: Translator["lookup"];
	/** Warns once per missing key without a fallback. */
	development: boolean;
}) =>
	withRender(
		(
			render: RenderInfo<SiteState>,
			key: SiteTranslationKey,
			options: TranslateOptions = {},
		): string => {
			const find = (locale: string) =>
				props.lookup({ scope: "site", key, locale, data: options.data });
			const translation =
				find(readLocale(props.config, render, options.locale)) ??
				find(props.config.defaultLocale);
			if (translation !== undefined) return translation;
			if (options.fallback !== undefined) {
				return formatTranslation(options.fallback, options.data);
			}

			if (props.development) {
				logger.warn({
					scope: PLUGIN_KEY,
					event: "plugin-site.translation.missing",
					dedupeKey: `${PLUGIN_KEY}:translation-missing:${key}`,
					message: `No site translation has the key '${key}', so pages show the key. Add it to a <locale>.site.json file or pass a fallback.`,
				});
			}
			return key;
		},
	);

export default createTranslateFunction;
