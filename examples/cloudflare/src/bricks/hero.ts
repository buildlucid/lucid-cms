import { BrickBuilder } from "@lucidcms/core";

const HeroBrick = new BrickBuilder("hero", {
	details: {
		name: "Hero",
	},
})
	.addTab("contentTab", {
		details: {
			label: "Content",
		},
	})
	.addText("heading", {
		details: {
			label: "Heading",
		},
	})
	.addTextarea("content", {
		details: {
			label: "Content",
		},
	})
	.addRepeater("callToActions", {
		details: {
			label: "Call to Action Links",
		},
		validation: {
			maxGroups: 2,
		},
	})
	.addLink("link", {
		details: {
			label: "Link",
		},
		validation: {
			required: true,
		},
	})
	.endRepeater()
	.addMedia("image", {
		details: {
			label: "Image",
		},
		validation: {
			type: "image",
		},
	});

export default HeroBrick;
