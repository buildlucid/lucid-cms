import { BrickBuilder, text } from "@lucidcms/core";

const SeoBrick = new BrickBuilder("seo", {
	details: {
		name: text.admin("bricks.seo.name", {
			defaultMessage: "SEO",
		}),
	},
})
	.addText("metaTitle", {
		details: {
			label: text.admin("bricks.seo.fields.metaTitle.label", {
				defaultMessage: "Meta Title",
			}),
		},
	})
	.addTextarea("metaDescription", {
		details: {
			label: text.admin("bricks.seo.fields.metaDescription.label", {
				defaultMessage: "Meta Description",
			}),
		},
	});

export default SeoBrick;
