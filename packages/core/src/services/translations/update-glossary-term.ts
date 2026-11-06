import { TranslationGlossaryRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkGlossaryTerm from "./helpers/check-glossary-term.js";

/** Replaces a glossary term's term, locale and translation. */
const updateGlossaryTerm: ServiceFn<
	[
		{
			id: number;
			term: string;
			locale: string | null;
			translation: string | null;
			userId: number;
		},
	],
	number
> = async (context, data) => {
	const checkRes = await checkGlossaryTerm(context, {
		id: data.id,
		term: data.term,
		locale: data.locale,
	});
	if (checkRes.error) return checkRes;

	const Glossary = new TranslationGlossaryRepository(context.db);
	const updateRes = await Glossary.updateSingle({
		data: {
			term: data.term,
			locale: data.locale,
			translation: data.translation,
			updated_by: data.userId,
			updated_at: new Date().toISOString(),
		},
		where: [{ key: "id", operator: "=", value: data.id }],
		returning: ["id"],
		validation: { enabled: true },
	});
	if (updateRes.error) return updateRes;

	return { error: undefined, data: updateRes.data.id };
};

export default updateGlossaryTerm;
