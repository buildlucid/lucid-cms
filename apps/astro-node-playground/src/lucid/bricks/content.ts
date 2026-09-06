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
	})
	.addRepeater("sections", {
		details: {
			label: "Sections",
		},
	})
	.addText("sectionHeading", {
		details: {
			label: "Section heading",
		},
	})
	.endRepeater();

export default ContentBrick;
