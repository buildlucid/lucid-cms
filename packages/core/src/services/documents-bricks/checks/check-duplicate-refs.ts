import { copy } from "../../../libs/i18n/index.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

/** A ref identifies one item in its containing array, independent of its position or database row. */
const checkDuplicateRefs = (data: {
	fields: FieldInputSchema[];
	bricks: BrickInputSchema[];
}): Awaited<ServiceResponse<undefined>> => {
	const duplicate = (refs: string[]) =>
		refs.find((ref, index) => refs.indexOf(ref) !== index);
	const checkFields = (fields: FieldInputSchema[]): string | undefined => {
		for (const field of fields) {
			const groups = field.groups ?? [];
			const ref = duplicate(groups.map((group) => group.ref));
			if (ref) return ref;

			for (const group of groups) {
				const child = checkFields(group.fields);
				if (child) return child;
			}
		}
	};
	let ref =
		duplicate(data.bricks.map((brick) => brick.ref)) ??
		checkFields(data.fields);
	for (const brick of data.bricks) ref ??= checkFields(brick.fields ?? []);
	return ref
		? {
				data: undefined,
				error: {
					status: 400,
					message: copy("server:core.documents.authoring.ref.duplicate", {
						data: { ref },
					}),
				},
			}
		: { data: undefined, error: undefined };
};

export default checkDuplicateRefs;
