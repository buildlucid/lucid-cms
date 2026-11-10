import { defineBrick, field } from "@lucidcms/core";

const ContentBrick = defineBrick({
	key: "content",
	details: {
		label: "Content",
	},
	fields: [
		field.text("heading", {
			details: {
				label: "Heading",
			},
		}),
		field.richText("body", {
			details: {
				label: "Body",
			},
		}),
	],
});

export default ContentBrick;
