import { CollectionBuilder, z } from "@lucidcms/core";
import ContentBrick from "../bricks/content.js";
import SeoBrick from "../bricks/seo.js";

const PageCollection = new CollectionBuilder("page", {
	mode: "multiple",
	details: {
		name: "Pages",
		singularName: "Page",
	},
	bricks: {
		fixed: [SeoBrick],
		builder: [ContentBrick],
	},
	autoSave: true,
	environments: [
		{
			key: "production",
			name: "Production",
		},
	],
	preview: {
		url: ({ document, env }) => {
			const fullSlug = document.fields.fullSlug;
			const previewOrigin = env?.PREVIEW_ORIGIN;

			return typeof fullSlug === "string" &&
				fullSlug.length > 0 &&
				typeof previewOrigin === "string"
				? new URL(fullSlug, previewOrigin)
				: null;
		},
	},
})
	.addText("title", {
		details: {
			label: "Title",
		},
		validation: {
			required: true,
			zod: z.string().min(2).max(96),
		},
		showInList: true,
	})
	.addTextarea("summary", {
		details: {
			label: "Summary",
		},
	});

export default PageCollection;
