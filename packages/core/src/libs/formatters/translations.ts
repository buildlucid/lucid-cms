import type { TranslationSettings } from "../../types/response.js";
import type {
	LucidTranslationGlossary,
	LucidTranslationStyles,
} from "../db/tables/index.js";
import type { Select } from "../db/types.js";

const formatSettings = (props: {
	glossary: Pick<
		Select<LucidTranslationGlossary>,
		"id" | "term" | "locale" | "translation"
	>[];
	styles: Pick<Select<LucidTranslationStyles>, "locale" | "instructions">[];
}): TranslationSettings => {
	return {
		glossary: props.glossary.map((term) => ({
			id: term.id,
			term: term.term,
			locale: term.locale,
			translation: term.translation,
		})),
		styles: props.styles.map((style) => ({
			locale: style.locale,
			instructions: style.instructions,
		})),
	};
};

export default {
	formatSettings,
};
