import type { DescendantFieldsResponse } from "../services/get-descendant-fields.js";
import formatFullSlug from "./format-fullslug.js";

const buildFullSlugFromSlugs = (data: {
	targetLocale: string;
	currentDescendant: DescendantFieldsResponse;
	descendants: Array<DescendantFieldsResponse>;
	topLevelFullSlug?: string;
}): string | null => {
	const rowForLocale = data.currentDescendant.rows.find(
		(row) => row.locale === data.targetLocale,
	);

	if (!rowForLocale || !rowForLocale._slug) return null;

	const slugFieldValue = rowForLocale._slug;
	const parentPageValue = rowForLocale._parentPage;

	if (!parentPageValue) {
		return formatFullSlug(data.topLevelFullSlug, slugFieldValue);
	}

	const parentDescendant = data.descendants.find(
		(descendant) => descendant.document_id === parentPageValue,
	);

	if (!parentDescendant) {
		return formatFullSlug(data.topLevelFullSlug, slugFieldValue);
	}

	const parentFullSlug = buildFullSlugFromSlugs({
		targetLocale: data.targetLocale,
		currentDescendant: parentDescendant,
		descendants: data.descendants,
		topLevelFullSlug: data.topLevelFullSlug,
	});

	return formatFullSlug(
		parentFullSlug || data.topLevelFullSlug,
		slugFieldValue,
	);
};

export default buildFullSlugFromSlugs;
