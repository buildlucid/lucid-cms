import T from "../../translations/index.js";
import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
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
	const LocalesRepo = Repository.get("locales", context.db, context.config.db);
	const LocalesFormatter = Formatter.get("locales");

	const configLocale = context.config.localisation.locales.find(
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

	const locale = await LocalesRepo.selectSingle({
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
	});

	if (locale === undefined) {
		return {
			error: {
				type: "basic",
				message: T("locale_not_found_message"),
				status: 404,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: LocalesFormatter.formatSingle({
			locale: locale,
			configLocale: configLocale,
			defaultLocale: context.config.localisation.defaultLocale,
		}),
	};
};

export default getSingle;
