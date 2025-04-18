import type { ParentPageQueryResponse } from "../services/get-parent-fields.js";

const buildFullSlug = (data: {
	parentFields: Array<ParentPageQueryResponse>;
	targetLocale: string;
	slug: string | null | undefined;
}): string | null => {
	if (data.slug === null || data.slug === undefined) return null;

	let result = data.slug;

	const targetParentFullSlugField = data.parentFields.find((field) => {
		return field.locale === data.targetLocale;
	});

	if (targetParentFullSlugField?._fullSlug) {
		result = `${targetParentFullSlugField._fullSlug}/${data.slug}`;
	}

	if (!result.startsWith("/")) {
		result = `/${result}`;
	}

	result = result.replace(/\/\//g, "/");
	return result;
};

export default buildFullSlug;
