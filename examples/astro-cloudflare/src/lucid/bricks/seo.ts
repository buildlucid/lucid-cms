import { BrickBuilder, copy } from "@lucidcms/core";

const SeoBrick = new BrickBuilder("seo", {
	details: {
		name: copy("admin:bricks.seo.name", { defaultMessage: "SEO" }),
	},
})
	.addText("metaTitle", {
		details: {
			label: copy("admin:bricks.seo.fields.metaTitle.label", {
				defaultMessage: "Meta Title",
			}),
		},
	})
	.addTextarea("metaDescription", {
		details: {
			label: copy("admin:bricks.seo.fields.metaDescription.label", {
				defaultMessage: "Meta Description",
			}),
		},
	});

export default SeoBrick;
