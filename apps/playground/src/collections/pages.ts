import { CollectionBuilder, text, z } from "@lucidcms/core";
import BannerBrick from "../bricks/banner.js";
import IntroBrick from "../bricks/intro.js";
import SEOBrick from "../bricks/seo.js";
import TestingBrick from "../bricks/testing.js";

const PageCollection = new CollectionBuilder("page", {
	mode: "multiple",
	details: {
		name: text.admin("collections.page.name", { defaultMessage: "Pages" }),
		singularName: text.admin("collections.page.singularName", {
			defaultMessage: "Page",
		}),
		summary: text.admin("collections.page.summary", {
			defaultMessage: "Manage the pages and content on your website.",
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
					name: text.admin("collections.page.workflow.todo.name", {
						defaultMessage: "To do",
					}),
					color: "yellow",
				},
				{
					key: "in-progress",
					name: text.admin("collections.page.workflow.in-progress.name", {
						defaultMessage: "In progress",
					}),
					publishTargets: ["staging"],
					color: "blue",
				},
				{
					key: "done",
					name: text.admin("collections.page.workflow.done.name", {
						defaultMessage: "Done",
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
				name: text.admin("collections.page.environments.staging.name", {
					defaultMessage: "Staging",
				}),
				permissions: {
					publish: "page:publish:staging",
					review: "page:review:staging",
				},
			},
			{
				key: "production",
				name: text.admin("collections.page.environments.production.name", {
					defaultMessage: "Production",
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
			label: text.admin("collections.page.fields.page_title.label", {
				defaultMessage: "Page title",
			}),
			summary: text.admin("collections.page.fields.page_title.summary", {
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
