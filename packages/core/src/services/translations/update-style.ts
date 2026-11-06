import { TranslationStylesRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { checkContentLocale } from "../locales/checks/index.js";

/** Sets a locale's style notes, which empty instructions remove. */
const updateStyle: ServiceFn<
	[
		{
			locale: string;
			instructions: string;
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	const localeRes = await checkContentLocale(context, { locale: data.locale });
	if (localeRes.error) return localeRes;

	const Styles = new TranslationStylesRepository(context.db);
	if (data.instructions === "") {
		const deleteRes = await Styles.deleteMultiple({
			where: [{ key: "locale", operator: "=", value: data.locale }],
		});
		if (deleteRes.error) return deleteRes;

		return { error: undefined, data: undefined };
	}

	const upsertRes = await Styles.upsertSingle({
		data: {
			locale: data.locale,
			instructions: data.instructions,
			updated_by: data.userId,
			updated_at: new Date().toISOString(),
		},
	});
	if (upsertRes.error) return upsertRes;

	return { error: undefined, data: undefined };
};

export default updateStyle;
