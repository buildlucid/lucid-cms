import type { DescendantFieldsResponse } from "../services/get-descendant-fields.js";

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
		return postSlugFormat(
			joinSlugs(data.topLevelFullSlug || "", slugFieldValue),
		);
	}

	const parentDescendant = data.descendants.find(
		(descendant) => descendant.document_id === parentPageValue,
	);

	if (!parentDescendant) {
		return postSlugFormat(
			joinSlugs(data.topLevelFullSlug || "", slugFieldValue),
		);
	}

	const parentFullSlug = buildFullSlugFromSlugs({
		targetLocale: data.targetLocale,
		currentDescendant: parentDescendant,
		descendants: data.descendants,
		topLevelFullSlug: data.topLevelFullSlug,
	});

	return postSlugFormat(
		joinSlugs(parentFullSlug || data.topLevelFullSlug || "", slugFieldValue),
	);
};

const joinSlugs = (...parts: string[]): string => {
	return parts.filter(Boolean).join("/").replace(/\/+/g, "/");
};

const postSlugFormat = (slug: string | null | undefined): string | null => {
	if (!slug) return null;
	let res = slug;
	if (!res.startsWith("/")) {
		res = `/${res}`;
	}
	return res.replace(/\/\//g, "/");
};

export default buildFullSlugFromSlugs;
