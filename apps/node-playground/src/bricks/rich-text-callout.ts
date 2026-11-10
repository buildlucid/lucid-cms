import { defineBrick, field } from "@lucidcms/core";

const RichTextCalloutBrick = defineBrick({
	key: "rt-callout",
	fields: [
		field.text("heading"),
		field.textarea("body", {
			validation: {
				required: true,
			},
		}),
		field.checkbox("emphasised"),
	],
});

export default RichTextCalloutBrick;
