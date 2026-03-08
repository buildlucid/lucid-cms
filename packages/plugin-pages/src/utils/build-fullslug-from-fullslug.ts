import type { ParentPageQueryResponse } from "../services/get-parent-fields.js";
import formatFullSlug from "./format-fullslug.js";

const buildFullSlug = (data: {
	parentFields: Array<ParentPageQueryResponse>;
	targetLocale: string;
	slug: string | null | undefined;
	prefix?: string;
}): string | null => {
	if (data.slug === null || data.slug === undefined) return null;

	const targetParentFullSlugField = data.parentFields.find((field) => {
		return field.locale === data.targetLocale;
	});

	if (targetParentFullSlugField?._fullSlug) {
		return formatFullSlug(targetParentFullSlugField._fullSlug, data.slug);
	}

	return formatFullSlug(data.prefix, data.slug);
};

export default buildFullSlug;
