import type {
	FieldError,
	FieldInputSchema,
	ServiceResponse,
} from "@lucidcms/core/types";
import T from "../../translations/index.js";

/**
 *  Returns an error if the required fields do not exist
 */
const checkFieldsExist = (data: {
	fields: {
		slug: FieldInputSchema | undefined;
		parentPage: FieldInputSchema | undefined;
		fullSlug: FieldInputSchema | undefined;
	};
}): Awaited<
	ServiceResponse<{
		slug: FieldInputSchema;
		parentPage: FieldInputSchema;
		fullSlug: FieldInputSchema;
	}>
> => {
	const fieldErrors: FieldError[] = [];

	if (data.fields.slug === undefined) {
		fieldErrors.push({
			key: "slug",
			localeCode: null,
			message: T("field_required"),
		});
	}
	if (data.fields.parentPage === undefined) {
		fieldErrors.push({
			key: "parentPage",
			localeCode: null,
			message: T("field_required"),
		});
	}
	if (data.fields.fullSlug === undefined) {
		fieldErrors.push({
			key: "fullSlug",
			localeCode: null,
			message: T("field_required"),
		});
	}

	if (fieldErrors.length) {
		return {
			error: {
				type: "basic",
				message: T("cannot_find_required_field_message"),
				status: 400,
				errors: {
					fields: fieldErrors,
				},
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			slug: data.fields.slug as FieldInputSchema,
			parentPage: data.fields.parentPage as FieldInputSchema,
			fullSlug: data.fields.fullSlug as FieldInputSchema,
		},
	};
};

export default checkFieldsExist;
