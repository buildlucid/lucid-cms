import { translationsFormatter } from "../../libs/formatters/index.js";
import {
	TranslationGlossaryRepository,
	TranslationStylesRepository,
} from "../../libs/repositories/index.js";
import type { TranslationSettings } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Reads the glossary and style notes every translation follows. */
const getSettings: ServiceFn<[], TranslationSettings> = async (context) => {
	const Glossary = new TranslationGlossaryRepository(context.db);
	const Styles = new TranslationStylesRepository(context.db);

	const [glossaryRes, stylesRes] = await Promise.all([
		Glossary.selectMultiple({
			select: ["id", "term", "locale", "translation"],
			orderBy: [{ column: "id", direction: "asc" }],
			validation: { enabled: true },
		}),
		Styles.selectMultiple({
			select: ["locale", "instructions"],
			orderBy: [{ column: "locale", direction: "asc" }],
			validation: { enabled: true },
		}),
	]);
	if (glossaryRes.error) return glossaryRes;
	if (stylesRes.error) return stylesRes;

	return {
		error: undefined,
		data: translationsFormatter.formatSettings({
			glossary: glossaryRes.data,
			styles: stylesRes.data,
		}),
	};
};

export default getSettings;
