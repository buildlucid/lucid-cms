import cacheKeys from "../../../libs/kv/cache-keys.js";
import Repository from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Deletes a single locale
 */
const deleteLocale: ServiceFn<
	[
		{
			localeCode: string;
		},
	],
	undefined
> = async (context, data) => {
	const Locales = Repository.get("locales", context.db, context.config.db);

	const deleteRes = await Locales.deleteSingle({
		where: [
			{
				key: "code",
				operator: "=",
				value: data.localeCode,
			},
		],
		returning: ["code"],
		validation: {
			enabled: true,
		},
	});
	if (deleteRes.error) return deleteRes;

	await context.kv.delete(cacheKeys.http.static.clientLocales);

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteLocale;
