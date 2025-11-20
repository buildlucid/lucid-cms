import { LocalesRepository } from "../../../libs/repositories/index.js";
import T from "../../../translations/index.js";
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

	const Locales = new LocalesRepository(context.db, context.config.db);

	const localesRes = await Locales.selectMultiple({
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
				value: context.config.db.getDefault("boolean", "true"),
			},
		],
		validation: {
			enabled: true,
		},
	});
	if (localesRes.error) return localesRes;

	if (localesRes.data.length !== localeCodes.length) {
		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					translations: {
						code: "invalid",
						message: T("make_sure_all_translations_locales_exist"),
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
