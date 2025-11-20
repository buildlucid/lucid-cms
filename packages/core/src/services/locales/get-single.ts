import T from "../../translations/index.js";
import { LocalesRepository } from "../../libs/repositories/index.js";
import { localesFormatter } from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { LocalesResponse } from "../../types/response.js";

const getSingle: ServiceFn<
	[
		{
			code: string;
		},
	],
	LocalesResponse
> = async (context, data) => {
	const Locales = new LocalesRepository(context.db, context.config.db);

	const configLocale = context.config.localization.locales.find(
		(locale) => locale.code === data.code,
	);

	if (!configLocale) {
		return {
			error: {
				type: "basic",
				message: T("locale_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const localeRes = await Locales.selectSingle({
		select: ["code", "created_at", "updated_at", "is_deleted", "is_deleted_at"],
		where: [
			{
				key: "code",
				operator: "=",
				value: data.code,
			},
			{
				key: "is_deleted",
				operator: "!=",
				value: context.config.db.getDefault("boolean", "true"),
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				message: T("locale_not_found_message"),
				status: 404,
			},
		},
	});
	if (localeRes.error) return localeRes;

	return {
		error: undefined,
		data: localesFormatter.formatSingle({
			locale: localeRes.data,
			configLocale: configLocale,
			defaultLocale: context.config.localization.defaultLocale,
		}),
	};
};

export default getSingle;
