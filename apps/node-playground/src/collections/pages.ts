import { CollectionBuilder, copy, z } from "@lucidcms/core";
import AllFieldsBrick from "../bricks/all-fields.js";
import BannerBrick from "../bricks/banner.js";
import IntroBrick from "../bricks/intro.js";
import TestingBrick from "../bricks/testing.js";

const PageCollection = new CollectionBuilder("page", {
	mode: "multiple",
	details: {
		labels: {
			singular: copy("admin:collections.page.singularName"),
			plural: copy("admin:collections.page.name"),
		},
		description: copy("admin:collections.page.summary"),
	},
	group: {
		key: "content",
		order: 0,
	},
	orderable: true,
	localized: { locales: ["en", "fr"], defaultLocale: "fr" },
	revisions: true,
	autoSave: true,
	hooks: [
		{
			service: "documents",
			event: "beforeUpsert",
			handler: async () => {
				return {
					error: undefined,
					data: undefined,
				};
			},
		},
		{
			service: "documents",
			event: "afterUpsert",
			handler: async () => {
				return {
					error: undefined,
					data: undefined,
				};
			},
		},
		{
			service: "documents",
			event: "beforeDelete",
			handler: async () => {
				return {
					error: undefined,
					data: undefined,
				};
			},
		},
		{
			service: "documents",
			event: "afterDelete",
			handler: async () => {
				return {
					error: undefined,
					data: undefined,
				};
			},
		},
	],
	bricks: {
		builder: [BannerBrick, IntroBrick, TestingBrick, AllFieldsBrick],
	},
	publishing: {
		targets: [
			{
				key: "staging",
				label: copy("admin:collections.page.environments.staging.name"),
			},
			{
				key: "production",
				label: copy("admin:collections.page.environments.production.name"),
				requires: ["staging"],
			},
		],
		review: {
			publish: ["production"],
		},
		workflow: {
			stages: [
				{
					key: "todo",
					label: copy("admin:collections.page.workflow.todo.name"),
					color: "yellow",
				},
				{
					key: "in-progress",
					label: copy("admin:collections.page.workflow.in-progress.name"),
					targets: ["staging"],
					color: "blue",
				},
				{
					key: "done",
					label: copy("admin:collections.page.workflow.done.name"),
					targets: ["production", "staging"],
					resetTo: "in-progress",
					color: "green",
				},
			],
		},
		scheduling: true,
	},
})
	.addText("page_title", {
		details: {
			label: copy("admin:collections.page.fields.page_title.label"),
			description: copy("admin:collections.page.fields.page_title.summary"),
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
	})
	.addRelation("settings", {
		collection: "settings",
		details: {
			label: "Settings",
		},
	});

export default PageCollection;
