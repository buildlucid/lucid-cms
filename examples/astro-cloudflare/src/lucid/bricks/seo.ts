import { adminText, BrickBuilder } from "@lucidcms/core";

const SeoBrick = new BrickBuilder("seo", {
	details: {
		name: adminText("bricks.seo.name", { fallback: "SEO" }),
	},
})
	.addText("metaTitle", {
		details: {
			label: adminText("bricks.seo.fields.metaTitle.label", {
				fallback: "Meta Title",
			}),
		},
	})
	.addTextarea("metaDescription", {
		details: {
			label: adminText("bricks.seo.fields.metaDescription.label", {
				fallback: "Meta Description",
			}),
		},
	});

export default SeoBrick;
