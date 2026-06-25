import { BrickBuilder, copy } from "@lucidcms/core";

const SEOBrick = new BrickBuilder("seo", {
	details: {
		name: copy("admin:bricks.seo.name"),
	},
})
	.addTab("basic_tab", {
		details: {
			label: copy("admin:bricks.seo.tabs.basic_tab.label"),
		},
	})
	.addText("label", {
		details: {
			label: copy("admin:bricks.seo.fields.label.label"),
			summary: copy("admin:bricks.seo.fields.label.summary"),
		},
		ai: {
			instructions:
				"Generate a SEO friendly title based on the context of the document.",
		},
	})
	.addTextarea("meta_description", {
		details: {
			label: copy("admin:bricks.seo.fields.meta_description.label"),
			summary: copy("admin:bricks.seo.fields.meta_description.summary"),
		},
		ai: {
			instructions:
				"Generate a SEO-friendly meta description based on the context of the document.",
		},
	})
	.addTab("social_tab", {
		details: {
			label: copy("admin:bricks.seo.tabs.social_tab.label"),
		},
	})
	.addText("social_title", {
		details: {
			label: copy("admin:bricks.seo.fields.social_title.label"),
		},
	})
	.addTextarea("social_description", {
		details: {
			label: copy("admin:bricks.seo.fields.social_description.label"),
		},
	})
	.addMedia("social_image", {
		details: {
			label: copy("admin:bricks.seo.fields.social_image.label"),
		},
		validation: {
			type: "image",
		},
		multiple: true,
	})
	.addTab("advanced_tab", {
		details: {
			label: copy("admin:bricks.seo.tabs.advanced_tab.label"),
		},
	})
	.addText("canonical_url", {
		details: {
			label: copy("admin:bricks.seo.fields.canonical_url.label"),
			summary: copy("admin:bricks.seo.fields.canonical_url.summary"),
		},
	})
	.addText("robots", {
		details: {
			label: copy("admin:bricks.seo.fields.robots.label"),
			summary: copy("admin:bricks.seo.fields.robots.summary"),
		},
	});

export default SEOBrick;
