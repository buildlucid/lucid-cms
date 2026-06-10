import { BrickBuilder, copy } from "@lucidcms/core";

const SeoBrick = new BrickBuilder("seo", {
	details: {
		name: copy("admin:bricks.seo.name"),
	},
})
	.addText("metaTitle", {
		details: {
			label: copy("admin:bricks.seo.fields.metaTitle.label"),
		},
	})
	.addTextarea("metaDescription", {
		details: {
			label: copy("admin:bricks.seo.fields.metaDescription.label"),
		},
	});

export default SeoBrick;
