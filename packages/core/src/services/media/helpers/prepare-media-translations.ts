import type { LucidMediaTranslations } from "../../../libs/db/tables/index.js";
import type { Insert } from "../../../libs/db/types.js";

const translationFields = [
	"title",
	"alt",
	"description",
	"summary",
	"transcript",
] as const;

type TranslationField = (typeof translationFields)[number];
type MediaTranslationRow = Pick<
	Insert<LucidMediaTranslations>,
	"media_id" | "locale_code"
> &
	Partial<Pick<Insert<LucidMediaTranslations>, TranslationField>>;

/**
 * Builds locale rows with only supplied fields, preserving omitted columns on upsert.
 * @remarks Null clears a field; unlabelled values use the default locale unless that field has an explicit default-locale value.
 */
const prepareMediaTranslations = (
	props: {
		[Field in TranslationField]?: {
			localeCode: string | null;
			value: string | null;
		}[];
	} & {
		mediaId: number;
		defaultLocale: string | null;
	},
): MediaTranslationRow[] => {
	const rows = new Map<string | null, MediaTranslationRow>();

	for (const field of translationFields) {
		const values = props[field] ?? [];

		for (const translation of values) {
			const locale = translation.localeCode ?? props.defaultLocale;
			if (
				translation.localeCode === null &&
				locale !== null &&
				values.some((t) => t.localeCode === locale)
			) {
				continue;
			}

			const row = rows.get(locale) ?? {
				locale_code: locale,
				media_id: props.mediaId,
			};
			row[field] = translation.value;
			rows.set(locale, row);
		}
	}

	return Array.from(rows.values());
};

export default prepareMediaTranslations;
