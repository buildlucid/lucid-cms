import constants from "../constants.js";

const buildFullSlug = (data: {
	parentFields: Array<{
		key: string;
		collection_document_id: number;
		collection_brick_id: number;
		locale_code: string;
		text_value: string | null;
		document_id: number | null;
	}>;
	targetLocale: string;
	slug: string | null | undefined;
}): string | null => {
	if (data.slug === null || data.slug === undefined) return null;
	let result = data.slug;

	const targetParentFullSlugField = data.parentFields.find((field) => {
		return (
			field.locale_code === data.targetLocale &&
			field.key === constants.fields.fullSlug.key
		);
	});

	if (targetParentFullSlugField?.text_value) {
		result = `${targetParentFullSlugField.text_value}/${data.slug}`;
	}

	if (!result.startsWith("/")) {
		result = `/${result}`;
	}

	result = result.replace(/\/\//g, "/");

	return result;
};

export default buildFullSlug;
