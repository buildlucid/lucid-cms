import T from "../../translations/index.js";
import type { FieldSchemaType, ServiceResponse } from "@lucidcms/core/types";

/**
 *  Returns an error if the required fields do not exist
 */
const checkFieldsExist = (data: {
	fields: {
		slug: FieldSchemaType | undefined;
		parentPage: FieldSchemaType | undefined;
		fullSlug: FieldSchemaType | undefined;
	};
}): Awaited<
	ServiceResponse<{
		slug: FieldSchemaType;
		parentPage: FieldSchemaType;
		fullSlug: FieldSchemaType;
	}>
> => {
	if (
		data.fields.parentPage === undefined ||
		data.fields.slug === undefined ||
		data.fields.fullSlug === undefined
	) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: T("cannot_find_required_fields_message"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			slug: data.fields.slug,
			parentPage: data.fields.parentPage,
			fullSlug: data.fields.fullSlug,
		},
	};
};

export default checkFieldsExist;
