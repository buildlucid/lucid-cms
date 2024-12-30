import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { LocalesResponse } from "../../types/response.js";

const getAll: ServiceFn<[], LocalesResponse[]> = async (context) => {
	const LocalesRepo = Repository.get("locales", context.db, context.config.db);
	const LocalesFormatter = Formatter.get("locales");

	const locales = await LocalesRepo.selectMultiple({
		select: ["code", "created_at", "updated_at", "is_deleted", "is_deleted_at"],
		where: [
			{
				key: "is_deleted",
				operator: "!=",
				value: context.config.db.config.defaults.boolean.true,
			},
		],
	});

	return {
		error: undefined,
		data: LocalesFormatter.formatMultiple({
			locales: locales,
			localisation: context.config.localisation,
		}),
	};
};

export default getAll;
