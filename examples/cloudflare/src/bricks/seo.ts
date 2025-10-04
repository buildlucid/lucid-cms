import { BrickBuilder } from "@lucidcms/core";

const SeoBrick = new BrickBuilder("seo", {
	details: {
		name: "SEO",
	},
})
	.addTab("basicTab", {
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
	.addTextarea("metaDescription", {
		details: {
			label: "Meta Description",
			summary:
				"The optimal meta description length for SEO is between 50 to 160 characters long.",
		},
	})
	.addTab("socialTab", {
		details: {
			label: "Social",
		},
	})
	.addText("socialTitle", {
		details: {
			label: "Social Title",
		},
	})
	.addTextarea("socialDescription", {
		details: {
			label: "Social Description",
		},
	})
	.addMedia("socialImage", {
		details: {
			label: "Social Image",
		},
		validation: {
			type: "image",
		},
	})
	.addTab("advancedTab", {
		details: {
			label: "Advanced",
		},
	})
	.addText("canonicalUrl", {
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

export default SeoBrick;
