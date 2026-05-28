import { adminText, BrickBuilder } from "@lucidcms/core";

const SEOBrick = new BrickBuilder("seo", {
	details: {
		name: adminText("bricks.seo.name", {
			fallback: "SEO",
		}),
	},
})
	.addTab("basic_tab", {
		details: {
			label: adminText("bricks.seo.tabs.basic_tab.label", {
				fallback: "Basic",
			}),
		},
	})
	.addText("label", {
		details: {
			label: adminText("bricks.seo.fields.label.label", {
				fallback: "SEO Title",
			}),
			summary: adminText("bricks.seo.fields.label.summary", {
				fallback:
					"The optimal title tag length for SEO is between 50 to 60 characters long.",
			}),
		},
	})
	.addTextarea("meta_description", {
		details: {
			label: adminText("bricks.seo.fields.meta_description.label", {
				fallback: "Meta Description",
			}),
			summary: adminText("bricks.seo.fields.meta_description.summary", {
				fallback:
					"The optimal meta description length for SEO is between 50 to 160 characters long.",
			}),
		},
	})
	.addTab("social_tab", {
		details: {
			label: adminText("bricks.seo.tabs.social_tab.label", {
				fallback: "Social",
			}),
		},
	})
	.addText("social_title", {
		details: {
			label: adminText("bricks.seo.fields.social_title.label", {
				fallback: "Social Title",
			}),
		},
	})
	.addTextarea("social_description", {
		details: {
			label: adminText("bricks.seo.fields.social_description.label", {
				fallback: "Social Description",
			}),
		},
	})
	.addMedia("social_image", {
		details: {
			label: adminText("bricks.seo.fields.social_image.label", {
				fallback: "Social Image",
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
			label: adminText("bricks.seo.tabs.advanced_tab.label", {
				fallback: "Advanced",
			}),
		},
	})
	.addText("canonical_url", {
		details: {
			label: adminText("bricks.seo.fields.canonical_url.label", {
				fallback: "Canonical URL",
			}),
			summary: adminText("bricks.seo.fields.canonical_url.summary", {
				fallback:
					"The canonical URL is the preferred version of a web page that search engines should index.",
			}),
		},
	})
	.addText("robots", {
		details: {
			label: adminText("bricks.seo.fields.robots.label", {
				fallback: "Robots",
			}),
			summary: adminText("bricks.seo.fields.robots.summary", {
				fallback:
					"The robots meta tag and X-Robots-Tag HTTP header controls crawling and indexing of a web page.",
			}),
		},
	});

export default SEOBrick;
