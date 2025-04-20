import T from "../../translations/index.js";
import type {
	FieldError,
	FieldSchemaType,
	ServiceResponse,
} from "@lucidcms/core/types";

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
	const fieldErrors: FieldError[] = [];

	if (data.fields.slug === undefined) {
		fieldErrors.push({
			key: "slug",
			localeCode: undefined,
			message: T("field_required"),
		});
	}
	if (data.fields.parentPage === undefined) {
		fieldErrors.push({
			key: "parentPage",
			localeCode: undefined,
			message: T("field_required"),
		});
	}
	if (data.fields.fullSlug === undefined) {
		fieldErrors.push({
			key: "fullSlug",
			localeCode: undefined,
			message: T("field_required"),
		});
	}

	if (fieldErrors.length) {
		return {
			error: {
				type: "basic",
				message: T("cannot_find_required_field_message"),
				status: 400,
				errorResponse: {
					body: {
						fields: fieldErrors,
					},
				},
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			slug: data.fields.slug as FieldSchemaType,
			parentPage: data.fields.parentPage as FieldSchemaType,
			fullSlug: data.fields.fullSlug as FieldSchemaType,
		},
	};
};

export default checkFieldsExist;
