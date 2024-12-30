import T from "../../../translations/index.js";
import Repository from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const checkLocalesExist: ServiceFn<
	[
		{
			localeCodes: string[];
		},
	],
	undefined
> = async (context, data) => {
	const localeCodes = Array.from(new Set(data.localeCodes));

	if (localeCodes.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const LocalesRepo = Repository.get("locales", context.db, context.config.db);

	const locales = await LocalesRepo.selectMultiple({
		select: ["code"],
		where: [
			{
				key: "code",
				operator: "in",
				value: localeCodes,
			},
			{
				key: "is_deleted",
				operator: "!=",
				value: context.config.db.config.defaults.boolean.true,
			},
		],
	});

	if (locales.length !== localeCodes.length) {
		return {
			error: {
				type: "basic",
				status: 400,
				errorResponse: {
					body: {
						translations: {
							code: "invalid",
							message: T("make_sure_all_translations_locales_exist"),
						},
					},
				},
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default checkLocalesExist;
