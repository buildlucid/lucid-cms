import { z } from "@lucidcms/core";
import { CollectionBuilder } from "@lucidcms/core/builders";
import BannerBrick from "../bricks/banner.js";
import IntroBrick from "../bricks/intro.js";
import SEOBrick from "../bricks/seo.js";

const PageCollection = new CollectionBuilder("page", {
	mode: "multiple",
	title: "Pages",
	singular: "Page",
	description: "Manage the pages and content on your website.",
	useTranslations: true,
	useDrafts: true,
	useRevisions: true,
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
	.addText(
		"page_title",
		{
			labels: {
				title: {
					en: "Page title",
				},
				description: "The title of the page.",
			},
			hidden: false,
			disabled: false,
			validation: {
				required: true,
				zod: z.string().min(2).max(128),
			},
		},
		{
			list: true,
			filterable: true,
		},
	)
	.addUser("author", undefined, {
		list: true,
	});

export default PageCollection;
