import { BrickBuilder, copy } from "@lucidcms/core";

const ContentBrick = new BrickBuilder("content", {
	details: {
		name: copy("admin:bricks.content.name", {
			defaultMessage: "Content",
		}),
	},
})
	.addText("heading", {
		details: {
			label: copy("admin:bricks.content.fields.heading.label", {
				defaultMessage: "Heading",
			}),
		},
	})
	.addTextarea("body", {
		details: {
			label: copy("admin:bricks.content.fields.body.label", {
				defaultMessage: "Body",
			}),
		},
	});

export default ContentBrick;
