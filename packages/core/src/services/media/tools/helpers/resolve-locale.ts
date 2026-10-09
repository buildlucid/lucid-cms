import { copy } from "../../../../libs/i18n/index.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";

/** Validates the requested content locale or CMS default, returning null when both are absent. */
const resolveMediaLocale = (
	context: ServiceContext,
	requested: string | undefined,
): Awaited<ServiceResponse<string | null>> => {
	const locale = requested ?? context.config.localization.defaultLocale;
	if (
		locale !== null &&
		!context.config.localization.locales.some((item) => item.code === locale)
	) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.tools.content.locale.unknown"),
			},
			data: undefined,
		};
	}

	return { error: undefined, data: locale };
};

export default resolveMediaLocale;
