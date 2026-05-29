import { BrickBuilder, text } from "@lucidcms/core";

const SEOBrick = new BrickBuilder("seo", {
	details: {
		name: text.admin("bricks.seo.name", { defaultMessage: "SEO" }),
	},
})
	.addTab("basic_tab", {
		details: {
			label: text.admin("bricks.seo.tabs.basic_tab.label", {
				defaultMessage: "Basic",
			}),
		},
	})
	.addText("label", {
		details: {
			label: text.admin("bricks.seo.fields.label.label", {
				defaultMessage: "SEO Title",
			}),
			summary: text.admin("bricks.seo.fields.label.summary", {
				defaultMessage:
					"The optimal title tag length for SEO is between 50 to 60 characters long.",
			}),
		},
	})
	.addTextarea("meta_description", {
		details: {
			label: text.admin("bricks.seo.fields.meta_description.label", {
				defaultMessage: "Meta Description",
			}),
			summary: text.admin("bricks.seo.fields.meta_description.summary", {
				defaultMessage:
					"The optimal meta description length for SEO is between 50 to 160 characters long.",
			}),
		},
	})
	.addTab("social_tab", {
		details: {
			label: text.admin("bricks.seo.tabs.social_tab.label", {
				defaultMessage: "Social",
			}),
		},
	})
	.addText("social_title", {
		details: {
			label: text.admin("bricks.seo.fields.social_title.label", {
				defaultMessage: "Social Title",
			}),
		},
	})
	.addTextarea("social_description", {
		details: {
			label: text.admin("bricks.seo.fields.social_description.label", {
				defaultMessage: "Social Description",
			}),
		},
	})
	.addMedia("social_image", {
		details: {
			label: text.admin("bricks.seo.fields.social_image.label", {
				defaultMessage: "Social Image",
			}),
		},
		validation: {
			type: "image",
		},
		config: {
			multiple: true,
		},
	})
	.addTab("advanced_tab", {
		details: {
			label: text.admin("bricks.seo.tabs.advanced_tab.label", {
				defaultMessage: "Advanced",
			}),
		},
	})
	.addText("canonical_url", {
		details: {
			label: text.admin("bricks.seo.fields.canonical_url.label", {
				defaultMessage: "Canonical URL",
			}),
			summary: text.admin("bricks.seo.fields.canonical_url.summary", {
				defaultMessage:
					"The canonical URL is the preferred version of a web page that search engines should index.",
			}),
		},
	})
	.addText("robots", {
		details: {
			label: text.admin("bricks.seo.fields.robots.label", {
				defaultMessage: "Robots",
			}),
			summary: text.admin("bricks.seo.fields.robots.summary", {
				defaultMessage:
					"The robots meta tag and X-Robots-Tag HTTP header controls crawling and indexing of a web page.",
			}),
		},
	});

export default SEOBrick;
