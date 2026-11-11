import { defineCollection, field } from "@lucidcms/core";

const COLLECTIONS = 50;
const FIELDS = 20;

/**
 * A content model the size of a big project: 50 collections of 20 fields and a repeater each.
 * `extraField` adds one field to every collection, as a small change to a large model.
 */
const largeModel = (options?: { extraField?: boolean }) =>
	Array.from({ length: COLLECTIONS }, (_, collection) =>
		defineCollection({
			key: `mig-large-${collection}`,
			mode: "multiple",
			details: {
				labels: {
					singular: `Large ${collection}`,
					plural: `Large ${collection}`,
				},
			},
			fields: [
				...Array.from({ length: FIELDS }, (_, index) =>
					index % 2 === 0
						? field.text(`text_${index}`)
						: field.number(`number_${index}`),
				),
				field.repeater("items", { fields: [field.text("item_text")] }),
				...(options?.extraField ? [field.text("extra")] : []),
			],
		}),
	);

export default largeModel;
