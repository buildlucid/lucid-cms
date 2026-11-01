import type { ParentPageQueryResponse } from "../services/get-parent-fields.js";
import formatPath from "./format-path.js";

/** Builds a localized route from the parent's stored path, falling back to the prefix when absent. */
const buildPath = (data: {
	parentFields: Array<ParentPageQueryResponse>;
	targetLocale: string | null;
	slug: string | null | undefined;
	prefix?: string;
}): string | null => {
	if (
		data.slug === null ||
		data.slug === undefined ||
		data.slug.trim() === ""
	) {
		return null;
	}

	const targetParentPathField = data.parentFields.find((field) => {
		return field.locale === data.targetLocale;
	});

	if (targetParentPathField?._path) {
		return formatPath(targetParentPathField._path, data.slug);
	}

	return formatPath(data.prefix, data.slug);
};

export default buildPath;
