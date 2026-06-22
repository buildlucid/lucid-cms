import { BrickBuilder } from "@lucidcms/core";

const SeoBrick = new BrickBuilder("seo", {
	details: {
		name: "SEO",
	},
})
	.addText("metaTitle", {
		details: {
			label: "Meta Title",
		},
	})
	.addTextarea("metaDescription", {
		details: {
			label: "Meta Description",
		},
	});

export default SeoBrick;
