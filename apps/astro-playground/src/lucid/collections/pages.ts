import { CollectionBuilder, copy, z } from "@lucidcms/core";
import BannerBrick from "../bricks/banner.js";
import IntroBrick from "../bricks/intro.js";
import SEOBrick from "../bricks/seo.js";
import TestingBrick from "../bricks/testing.js";

const PageCollection = new CollectionBuilder("page", {
	mode: "multiple",
	details: {
		name: copy("admin:collections.page.name", { defaultMessage: "Pages" }),
		singularName: copy("admin:collections.page.singularName", {
			defaultMessage: "Page",
		}),
		summary: copy("admin:collections.page.summary", {
			defaultMessage: "Manage the pages and content on your website.",
		}),
	},
	config: {
		localized: true,
		revisions: true,
		autoSave: true,
		environments: [
			{
				key: "staging",
				name: copy("admin:collections.page.environments.staging.name", {
					defaultMessage: "Staging",
				}),
			},
			{
				key: "production",
				name: copy("admin:collections.page.environments.production.name", {
					defaultMessage: "Production",
				}),
			},
		],
	},
	hooks: [
		{
			service: "documents",
			event: "beforeUpsert",
			handler: async (_context, _data) => {
				// console.log("beforeUpsert hook collection", data.data);
				return {
					error: undefined,
					data: undefined,
				};
			},
		},
		{
			service: "documents",
			event: "afterUpsert",
			handler: async (_context, _data) => {
				// console.log("afterUpsert hook collection", data.data);
				return {
					error: undefined,
					data: undefined,
				};
			},
		},
		{
			service: "documents",
			event: "beforeDelete",
			handler: async (_context, _data) => {
				// console.log("beforeDelete hook collection", data.data);
				return {
					error: undefined,
					data: undefined,
				};
			},
		},
		{
			service: "documents",
			event: "afterDelete",
			handler: async (_context, _data) => {
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
		builder: [BannerBrick, IntroBrick, TestingBrick],
	},
})
	.addText("page_title", {
		details: {
			label: copy("admin:collections.page.fields.page_title.label", {
				defaultMessage: "Page title",
			}),
			summary: copy("admin:collections.page.fields.page_title.summary", {
				defaultMessage: "The title of the page.",
			}),
		},
		config: {
			hidden: false,
			disabled: false,
		},
		validation: {
			required: true,
			zod: z.string().min(2).max(128),
		},
		displayInListing: true,
	})
	.addUser("author", {
		displayInListing: true,
		config: {
			multiple: true,
		},
	});

export default PageCollection;
