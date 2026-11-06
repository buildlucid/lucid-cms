import { TranslationGlossaryRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkGlossaryTerm from "./helpers/check-glossary-term.js";

/** Adds a glossary term that every translation into its locale follows. */
const createGlossaryTerm: ServiceFn<
	[
		{
			term: string;
			locale: string | null;
			translation: string | null;
			userId: number;
		},
	],
	number
> = async (context, data) => {
	const checkRes = await checkGlossaryTerm(context, {
		term: data.term,
		locale: data.locale,
	});
	if (checkRes.error) return checkRes;

	const Glossary = new TranslationGlossaryRepository(context.db);
	const createRes = await Glossary.createSingle({
		data: {
			term: data.term,
			locale: data.locale,
			translation: data.translation,
			updated_by: data.userId,
			updated_at: new Date().toISOString(),
		},
		returning: ["id"],
		validation: { enabled: true },
	});
	if (createRes.error) return createRes;

	return { error: undefined, data: createRes.data.id };
};

export default createGlossaryTerm;
