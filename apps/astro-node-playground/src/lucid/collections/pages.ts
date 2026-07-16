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
	localized: true,
	autoSave: true,
	revisions: true,
	review: {
		requiredFor: ["production"],
	},
	environments: [
		{
			key: "production",
			name: "Production",
		},
	],
	preview: {
		breakpoints: [
			{ key: "laptop", label: "Laptop", width: 1280 },
			{ key: "tablet", label: "Tablet", width: 768 },
			{ key: "mobile", label: "Mobile", width: 390 },
		],
		url: ({ document, env, locale }) => {
			const fullSlugs = document.fields.fullSlug;
			const fullSlug =
				typeof fullSlugs === "object" &&
				fullSlugs !== null &&
				!Array.isArray(fullSlugs)
					? Object.entries(fullSlugs).find(([key]) => key === locale)?.[1]
					: null;

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
