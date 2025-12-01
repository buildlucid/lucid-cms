import { z } from "@lucidcms/core";
import { CollectionBuilder } from "@lucidcms/core/builders";
import BannerBrick from "../bricks/banner.js";
import IntroBrick from "../bricks/intro.js";
import SEOBrick from "../bricks/seo.js";

const PageCollection = new CollectionBuilder("page", {
	mode: "multiple",
	details: {
		name: "Pages",
		singularName: {
			en: "Page",
		},
		summary: "Manage the pages and content on your website.",
	},
	config: {
		useTranslations: true,
		useRevisions: true,
		// useAutoSave: true,
		environments: [
			{
				key: "staging",
				name: {
					en: "Staging",
				},
			},
			{
				key: "production",
				name: {
					en: "Production",
				},
			},
		],
	},
	hooks: [
		{
			event: "beforeUpsert",
			handler: async (context, data) => {
				// console.log("beforeUpsert hook collection", data.data);
				return {
					error: undefined,
					data: undefined,
				};
			},
		},
		{
			event: "afterUpsert",
			handler: async (context, data) => {
				// console.log("afterUpsert hook collection", data.data);
				return {
					error: undefined,
					data: undefined,
				};
			},
		},
		{
			event: "beforeDelete",
			handler: async (context, data) => {
				// console.log("beforeDelete hook collection", data.data);
				return {
					error: undefined,
					data: undefined,
				};
			},
		},
		{
			event: "afterDelete",
			handler: async (context, data) => {
				// console.log("afterDelete hook collection", data.data);
				return {
					error: undefined,
					data: undefined,
				};
			},
		},
	],
	bricks: {
		fixed: [SEOBrick],
		builder: [BannerBrick, IntroBrick],
	},
})
	.addText("page_title", {
		details: {
			label: {
				en: "Page title",
			},
			summary: "The title of the page.",
		},
		config: {
			isHidden: false,
			isDisabled: false,
		},
		validation: {
			required: true,
			zod: z.string().min(2).max(128),
		},
		displayInListing: true,
	})
	.addUser("author", {
		displayInListing: true,
	});

export default PageCollection;
