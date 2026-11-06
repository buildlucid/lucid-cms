import { TranslationGlossaryRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Removes a glossary term. */
const deleteGlossaryTerm: ServiceFn<[{ id: number }], number> = async (
	context,
	data,
) => {
	const Glossary = new TranslationGlossaryRepository(context.db);
	const deleteRes = await Glossary.deleteSingle({
		where: [{ key: "id", operator: "=", value: data.id }],
		returning: ["id"],
		validation: { enabled: true },
	});
	if (deleteRes.error) return deleteRes;

	return { error: undefined, data: deleteRes.data.id };
};

export default deleteGlossaryTerm;
