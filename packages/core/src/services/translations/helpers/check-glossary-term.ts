import { copy } from "../../../libs/i18n/index.js";
import { TranslationGlossaryRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { checkContentLocale } from "../../locales/checks/index.js";

/** Checks a glossary term's locale exists and that the glossary doesn't already have the term for it. */
const checkGlossaryTerm: ServiceFn<
	[
		{
			term: string;
			locale: string | null;
			/** The term being updated, which can keep its own term and locale. */
			id?: number;
		},
	],
	undefined
> = async (context, data) => {
	const localeRes = await checkContentLocale(context, {
		locale: data.locale ?? undefined,
	});
	if (localeRes.error) return localeRes;

	const Glossary = new TranslationGlossaryRepository(context.db);
	const termsRes = await Glossary.selectMultiple({
		select: ["id", "term", "locale"],
		where: [],
		validation: { enabled: true },
	});
	if (termsRes.error) return termsRes;

	//* terms match whatever their case, as translating finds them
	const term = data.term.toLowerCase();
	const duplicate = termsRes.data.some(
		(entry) =>
			entry.id !== data.id &&
			entry.locale === data.locale &&
			entry.term.toLowerCase() === term,
	);
	if (duplicate) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.translations.glossary.duplicate"),
				status: 400,
				errors: {
					fields: [
						{
							key: "term",
							message: copy("server:core.translations.glossary.duplicate"),
						},
					],
				},
			},
			data: undefined,
		};
	}

	return { error: undefined, data: undefined };
};

export default checkGlossaryTerm;
