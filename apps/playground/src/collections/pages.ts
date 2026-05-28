import { adminText, CollectionBuilder, z } from "@lucidcms/core";
import BannerBrick from "../bricks/banner.js";
import IntroBrick from "../bricks/intro.js";
import SEOBrick from "../bricks/seo.js";
import TestingBrick from "../bricks/testing.js";

const PageCollection = new CollectionBuilder("page", {
	mode: "multiple",
	details: {
		name: adminText("collections.page.name", {
			fallback: "Pages",
		}),
		singularName: adminText("collections.page.singularName", {
			fallback: "Page",
		}),
		summary: adminText("collections.page.summary", {
			fallback: "Manage the pages and content on your website.",
		}),
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
		localized: true,
		revisions: true,
		autoSave: true,
		scheduling: true,
		review: {
			requiredFor: ["production"],
			allowSelfApproval: true,
			comments: {
				request: "required",
				decision: "optional",
			},
		},
		workflow: {
			stages: [
				{
					key: "todo",
					name: adminText("collections.page.workflow.todo.name", {
						fallback: "To do",
					}),
					color: "yellow",
				},
				{
					key: "in-progress",
					name: adminText("collections.page.workflow.in-progress.name", {
						fallback: "In progress",
					}),
					publishTargets: ["staging"],
					color: "blue",
				},
				{
					key: "done",
					name: adminText("collections.page.workflow.done.name", {
						fallback: "Done",
					}),
					publishTargets: ["production", "staging"],
					color: "green",
					permissions: {
						moveTo: "page:workflow:done",
						moveFrom: "page:workflow:todo",
					},
				},
			],
		},
		environments: [
			{
				key: "staging",
				name: adminText("collections.page.environments.staging.name", {
					fallback: "Staging",
				}),
				permissions: {
					publish: "page:publish:staging",
					review: "page:review:staging",
				},
			},
			{
				key: "production",
				name: adminText("collections.page.environments.production.name", {
					fallback: "Production",
				}),
				permissions: {
					publish: "page:publish:production",
					review: "page:review:production",
				},
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
			label: adminText("collections.page.fields.page_title.label", {
				fallback: "Page title",
			}),
			summary: adminText("collections.page.fields.page_title.summary", {
				fallback: "The title of the page.",
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
