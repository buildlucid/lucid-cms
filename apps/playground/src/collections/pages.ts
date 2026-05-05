import { CollectionBuilder, z } from "@lucidcms/core";
import BannerBrick from "../bricks/banner.js";
import IntroBrick from "../bricks/intro.js";
import SEOBrick from "../bricks/seo.js";
import TestingBrick from "../bricks/testing.js";

const PageCollection = new CollectionBuilder("page", {
	mode: "multiple",
	details: {
		name: "Pages",
		singularName: {
			en: "Page",
		},
		summary: "Manage the pages and content on your website.",
	},
	permissions: {
		read: "page:read",
		create: "page:create",
		update: "page:update",
		delete: "page:delete",
		restore: "page:restore",
		publish: "page:publish",
		review: "page:review",
	},
	config: {
		useTranslations: true,
		useRevisions: true,
		useAutoSave: true,
		publishing: {
			review: {
				targets: ["production"],
				allowSelfApproval: true,
				comments: {
					request: "required",
					decision: "optional",
				},
			},
		},
		environments: [
			{
				key: "staging",
				name: {
					en: "Staging",
				},
				permissions: {
					publish: "page:publish:staging",
					review: "page:review:staging",
				},
			},
			{
				key: "production",
				name: {
					en: "Production",
				},
				permissions: {
					publish: "page:publish:production",
					review: "page:review:production",
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
		builder: [BannerBrick, IntroBrick, TestingBrick],
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
		config: {
			multiple: true,
		},
	});

export default PageCollection;
