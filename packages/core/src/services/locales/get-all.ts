import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { LocalesResponse } from "../../types/response.js";

const getAll: ServiceFn<[], LocalesResponse[]> = async (context) => {
	const Locales = Repository.get("locales", context.db, context.config.db);
	const LocalesFormatter = Formatter.get("locales");

	const localesRes = await Locales.selectMultiple({
		select: ["code", "created_at", "updated_at", "is_deleted", "is_deleted_at"],
		where: [
			{
				key: "is_deleted",
				operator: "!=",
				value: context.config.db.getDefault("boolean", "true"),
			},
		],
		validation: {
			enabled: true,
		},
	});
	if (localesRes.error) return localesRes;

	return {
		error: undefined,
		data: LocalesFormatter.formatMultiple({
			locales: localesRes.data,
			localisation: context.config.localisation,
		}),
	};
};

export default getAll;
