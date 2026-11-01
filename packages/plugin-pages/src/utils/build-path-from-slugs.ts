import type { PageVersionFields } from "../services/get-pages-fields.js";
import formatPath from "./format-path.js";

/** Builds a descendant's route from ancestor slugs and the top-level path. */
const buildPathFromSlugs = (data: {
	targetLocale: string | null;
	currentDescendant: PageVersionFields;
	descendants: Array<PageVersionFields>;
	topLevelPath?: string;
}): string | null => {
	const rowForLocale = data.currentDescendant.rows.find(
		(row) => row.locale === data.targetLocale,
	);

	if (!rowForLocale?._slug) return null;

	const slugFieldValue = rowForLocale._slug;
	const parentPageValue = rowForLocale._parentPage;

	if (!parentPageValue) {
		return formatPath(data.topLevelPath, slugFieldValue);
	}

	const parentDescendant = data.descendants.find(
		(descendant) => descendant.document_id === parentPageValue,
	);

	if (!parentDescendant) {
		return formatPath(data.topLevelPath, slugFieldValue);
	}

	const parentPath = buildPathFromSlugs({
		targetLocale: data.targetLocale,
		currentDescendant: parentDescendant,
		descendants: data.descendants,
		topLevelPath: data.topLevelPath,
	});

	return formatPath(parentPath || data.topLevelPath, slugFieldValue);
};

export default buildPathFromSlugs;
