import { localesFormatter } from "../../libs/formatters/index.js";
import { text } from "../../libs/i18n/index.js";
import { LocalesRepository } from "../../libs/repositories/index.js";
import type { Locale } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getSingle: ServiceFn<
	[
		{
			code: string;
		},
	],
	Locale
> = async (context, data) => {
	const Locales = new LocalesRepository(context.db.client, context.config.db);

	const configLocale = context.config.i18n.content.locales.find(
		(locale) => locale.code === data.code,
	);

	if (!configLocale) {
		return {
			error: {
				type: "basic",
				message: text.server("core.locale.not.found.message"),
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
				message: text.server("core.locale.not.found.message"),
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
			defaultLocale: context.config.i18n.content.defaultLocale,
		}),
	};
};

export default getSingle;
