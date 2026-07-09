import { CollectionBuilder, copy, z } from "@lucidcms/core";
import BannerBrick from "../bricks/banner.js";
import IntroBrick from "../bricks/intro.js";
import SEOBrick from "../bricks/seo.js";
import TestingBrick from "../bricks/testing.js";

const PageCollection = new CollectionBuilder("page", {
	mode: "multiple",
	details: {
		name: copy("admin:collections.page.name"),
		singularName: copy("admin:collections.page.singularName"),
		summary: copy("admin:collections.page.summary"),
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
	group: {
		key: "content",
		order: 0,
	},
	orderable: true,
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
				name: copy("admin:collections.page.workflow.todo.name"),
				color: "yellow",
			},
			{
				key: "in-progress",
				name: copy("admin:collections.page.workflow.in-progress.name"),
				publishTargets: ["staging"],
				color: "blue",
			},
			{
				key: "done",
				name: copy("admin:collections.page.workflow.done.name"),
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
			name: copy("admin:collections.page.environments.staging.name"),
			permissions: {
				publish: "page:publish:staging",
				review: "page:review:staging",
			},
		},
		{
			key: "production",
			name: copy("admin:collections.page.environments.production.name"),
			requires: ["staging"],
			permissions: {
				publish: "page:publish:production",
				review: "page:review:production",
			},
		},
	],
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
			label: copy("admin:collections.page.fields.page_title.label"),
			summary: copy("admin:collections.page.fields.page_title.summary"),
		},
		ui: {
			hidden: false,
			disabled: false,
		},
		validation: {
			required: true,
			zod: z.string().min(2).max(128),
		},
		showInList: true,
		useAsLabel: true,
	})
	.addUser("author", {
		showInList: true,
		multiple: true,
	});

export default PageCollection;
