import { BrickBuilder, text } from "@lucidcms/core";

const ContentBrick = new BrickBuilder("content", {
	details: {
		name: text.admin("bricks.content.name", { defaultMessage: "Content" }),
	},
})
	.addText("heading", {
		details: {
			label: text.admin("bricks.content.fields.heading.label", {
				defaultMessage: "Heading",
			}),
		},
	})
	.addTextarea("body", {
		details: {
			label: text.admin("bricks.content.fields.body.label", {
				defaultMessage: "Body",
			}),
		},
	});

export default ContentBrick;
