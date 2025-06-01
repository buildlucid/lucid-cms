import { BrickBuilder } from "@lucidcms/core/builders";

const SEOBrick = new BrickBuilder("seo", {
	details: {
		name: "SEO",
	},
})
	.addTab("basic_tab", {
		details: {
			label: "Basic",
		},
	})
	.addText("label", {
		details: {
			label: "SEO Title",
			summary:
				"The optimal title tag length for SEO is between 50 to 60 characters long.",
		},
	})
	.addTextarea("meta_description", {
		details: {
			label: "Meta Description",
			summary:
				"The optimal meta description length for SEO is between 50 to 160 characters long.",
		},
	})
	.addTab("social_tab", {
		details: {
			label: "Social",
		},
	})
	.addText("social_title", {
		details: {
			label: "Social Title",
		},
	})
	.addTextarea("social_description", {
		details: {
			label: "Social Description",
		},
	})
	.addMedia("social_image", {
		details: {
			label: "Social Image",
		},
		validation: {
			type: "image",
		},
	})
	.addTab("advanced_tab", {
		details: {
			label: "Advanced",
		},
	})
	.addText("canonical_url", {
		details: {
			label: "Canonical URL",
			summary:
				"The canonical URL is the preferred version of a web page that search engines should index.",
		},
	})
	.addText("robots", {
		details: {
			label: "Robots",
			summary:
				"The robots meta tag and X-Robots-Tag HTTP header controls crawling and indexing of a web page.",
		},
	});

export default SEOBrick;
