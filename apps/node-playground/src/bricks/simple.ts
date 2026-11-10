import { defineBrick, field } from "@lucidcms/core";

const SimpleBrick = defineBrick({
	key: "simple",
	fields: [
		field.text("heading", {
			localized: false,
		}),
		field.media("image", {
			multiple: true,
		}),
		field.relation("document", {
			collection: "simple",
			validation: {
				// required: true,
			},
		}),
		field.repeater("items", {
			fields: [
				field.text("itemTitle"),
				field.repeater("nestedItems", {
					fields: [
						field.text("nestedItemTitle", {
							validation: {
								required: true,
							},
						}),
						field.checkbox("nestedCheckbox"),
					],
				}),
			],
		}),
	],
});

export default SimpleBrick;
