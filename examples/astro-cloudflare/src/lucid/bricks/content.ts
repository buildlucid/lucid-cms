import { adminText, BrickBuilder } from "@lucidcms/core";

const ContentBrick = new BrickBuilder("content", {
	details: {
		name: adminText("bricks.content.name", { fallback: "Content" }),
	},
})
	.addText("heading", {
		details: {
			label: adminText("bricks.content.fields.heading.label", {
				fallback: "Heading",
			}),
		},
	})
	.addTextarea("body", {
		details: {
			label: adminText("bricks.content.fields.body.label", {
				fallback: "Body",
			}),
		},
	});

export default ContentBrick;
