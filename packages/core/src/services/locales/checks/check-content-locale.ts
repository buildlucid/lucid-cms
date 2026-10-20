import { copy } from "../../../libs/i18n/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Rejects unknown content or fallback locales unless the project has no configured locales and therefore no translated content. */
const checkContentLocale: ServiceFn<
	[{ locale?: string; fallbackLocale?: string }],
	undefined
> = async (context, data) => {
	const { locales } = context.config.localization;
	const unknown = [data.locale, data.fallbackLocale].some(
		(code) =>
			code !== undefined &&
			locales.length > 0 &&
			!locales.some((locale) => locale.code === code),
	);
	if (unknown) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.content.locale.unknown"),
			},
			data: undefined,
		};
	}

	return { error: undefined, data: undefined };
};

export default checkContentLocale;
