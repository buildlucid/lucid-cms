import { defineBrick, field } from "@lucidcms/core";

const SeoBrick = defineBrick({
	key: "seo",
	details: {
		label: "SEO",
	},
	fields: [
		field.text("metaTitle", {
			details: {
				label: "Meta Title",
			},
		}),
		field.textarea("metaDescription", {
			details: {
				label: "Meta Description",
			},
		}),
	],
});

export default SeoBrick;
