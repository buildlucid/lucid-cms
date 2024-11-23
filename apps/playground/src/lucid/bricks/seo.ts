import { BrickBuilder } from "@lucidcms/core/builders";

const SEOBrick = new BrickBuilder("seo", {
	details: {
		name: "SEO",
	},
})
	.addTab("basic_tab", {
		labels: {
			title: "Basic",
		},
	})
	.addText("title", {
		labels: {
			title: "SEO Title",
			description:
				"The optimal title tag length for SEO is between 50 to 60 characters long.",
		},
	})
	.addTextarea("meta_description", {
		labels: {
			title: "Meta Description",
			description:
				"The optimal meta description length for SEO is between 50 to 160 characters long.",
		},
	})
	.addTab("social_tab", {
		labels: {
			title: "Social",
		},
	})
	.addText("social_title", {
		labels: {
			title: "Social Title",
		},
	})
	.addTextarea("social_description", {
		labels: {
			title: "Social Description",
		},
	})
	.addMedia("social_image", {
		labels: {
			title: "Social Image",
		},
		validation: {
			type: "image",
		},
	})
	.addTab("advanced_tab", {
		labels: {
			title: "Advanced",
		},
	})
	.addText("canonical_url", {
		labels: {
			title: "Canonical URL",
			description:
				"The canonical URL is the preferred version of a web page that search engines should index.",
		},
	})
	.addText("robots", {
		labels: {
			title: "Robots",
			description:
				"The robots meta tag and X-Robots-Tag HTTP header controls crawling and indexing of a web page.",
		},
	});

export default SEOBrick;
