import { BrickBuilder } from "@lucidcms/core";

const ContentBrick = new BrickBuilder("content", {
	details: {
		label: "Content",
	},
})
	.addText("heading", {
		details: {
			label: "Heading",
		},
	})
	.addTextarea("body", {
		details: {
			label: "Body",
		},
	});

export default ContentBrick;
