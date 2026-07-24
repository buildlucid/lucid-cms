import { BrickBuilder } from "@lucidcms/core";

const ContentBrick = new BrickBuilder("content", {
	details: {
		name: "Content",
	},
})
	.addText("heading", {
		details: {
			label: "Heading",
		},
	})
	.addRichText("body", {
		details: {
			label: "Body",
		},
	});

export default ContentBrick;
