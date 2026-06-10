import { BrickBuilder, copy } from "@lucidcms/core";

const ContentBrick = new BrickBuilder("content", {
	details: {
		name: copy("admin:bricks.content.name"),
	},
})
	.addText("heading", {
		details: {
			label: copy("admin:bricks.content.fields.heading.label"),
		},
	})
	.addTextarea("body", {
		details: {
			label: copy("admin:bricks.content.fields.body.label"),
		},
	});

export default ContentBrick;
