import { BrickBuilder, copy } from "@lucidcms/core";
import type { FieldOptions } from "@lucidcms/core/types";
import { fields } from "../constants.js";
import {
	canonicalUrlSchema,
	metadataNameSchema,
	nonBlankTextSchema,
	previewLimitSchema,
	structuredDataSchema,
} from "../shared/validation.js";

const copyInstructions =
	"Use only facts supported by the document context. Write in the selected content locale. Be specific to this page, concise and natural. Avoid keyword stuffing, clickbait, repeated branding and invented claims, prices, offers or statistics. Return only the requested copy, without HTML or quotation marks. Length suggestions are editorial guidance, not ranking requirements.";

/** Creates an independent fixed brick using Lucid's native inputs and validation. */
const createSeoBrick = ({
	brickKey,
	localized,
}: {
	brickKey: string;
	localized: boolean;
}) => {
	const titleOptions: FieldOptions<"text"> = {
		localized,
		validation: { zod: nonBlankTextSchema },
		ai: {
			instructions: `Write a descriptive page title. ${copyInstructions}`,
			guidance: [
				{
					key: "concise",
					label: copy("admin:plugin.seo.ai.concise"),
					instructions:
						"Shorten the existing title without losing its subject or inventing information.",
				},
			],
		},
	};

	const descriptionOptions: FieldOptions<"textarea"> = {
		localized,
		validation: { zod: nonBlankTextSchema },
		ai: {
			instructions: `Summarize the actual page content and why it is useful to the reader. ${copyInstructions}`,
			guidance: [
				{
					key: "concise",
					label: copy("admin:plugin.seo.ai.concise"),
					instructions:
						"Shorten the existing summary while keeping its most useful, supported details.",
				},
			],
		},
	};

	const imageOptions: FieldOptions<"media"> = {
		localized,
		multiple: false,
		validation: {
			type: "image",
			extensions: ["jpg", "jpeg", "png", "webp", "gif"],
			maxItems: 1,
		},
	};

	return (
		new BrickBuilder(brickKey, {
			details: {
				label: copy("admin:plugin.seo.brick.label"),
				description: copy("admin:plugin.seo.brick.description"),
			},
		})
			// Search
			.addTab("search", {
				details: {
					label: copy("admin:plugin.seo.group.search"),
				},
			})
			.addText(fields.title, {
				...titleOptions,
				details: {
					label: copy("admin:plugin.seo.field.title"),
				},
			})
			.addTextarea(fields.description, {
				...descriptionOptions,
				details: {
					label: copy("admin:plugin.seo.field.description"),
				},
			})
			// Social
			.addTab("social", {
				details: {
					label: copy("admin:plugin.seo.group.social"),
				},
			})
			.addText(fields.socialTitle, {
				...titleOptions,
				details: {
					label: copy("admin:plugin.seo.field.socialTitle"),
				},
			})
			.addTextarea(fields.socialDescription, {
				...descriptionOptions,
				details: {
					label: copy("admin:plugin.seo.field.socialDescription"),
				},
			})
			.addMedia(fields.socialImage, {
				...imageOptions,
				details: {
					label: copy("admin:plugin.seo.field.socialImage"),
					description: copy("admin:plugin.seo.help.socialImage"),
				},
			})
			.addText(fields.socialImageAlt, {
				localized,
				ai: { enabled: false },
				details: {
					label: copy("admin:plugin.seo.field.socialImageAlt"),
				},
			})
			.addSelect(fields.ogType, {
				localized,
				default: "website",
				options: [
					{
						value: "website",
						label: copy("admin:plugin.seo.option.website"),
					},
					{
						value: "article",
						label: copy("admin:plugin.seo.option.article"),
					},
				],
				details: {
					label: copy("admin:plugin.seo.field.ogType"),
					description: copy("admin:plugin.seo.help.ogType"),
				},
			})
			.addCollapsible("x", {
				output: "inline",
				defaultOpen: false,
				details: {
					label: copy("admin:plugin.seo.group.x"),
					description: copy("admin:plugin.seo.group.x.help"),
				},
			})
			.addSelect(fields.xCard, {
				localized,
				default: "summary_large_image",
				options: [
					{
						value: "summary",
						label: copy("admin:plugin.seo.option.summary"),
					},
					{
						value: "summary_large_image",
						label: copy("admin:plugin.seo.option.summary_large_image"),
					},
				],
				details: {
					label: copy("admin:plugin.seo.field.xCard"),
					description: copy("admin:plugin.seo.help.xCard"),
				},
			})
			.addText(fields.xTitle, {
				...titleOptions,
				details: {
					label: copy("admin:plugin.seo.field.xTitle"),
				},
			})
			.addTextarea(fields.xDescription, {
				...descriptionOptions,
				details: {
					label: copy("admin:plugin.seo.field.xDescription"),
				},
			})
			.addMedia(fields.xImage, {
				...imageOptions,
				details: {
					label: copy("admin:plugin.seo.field.xImage"),
					description: copy("admin:plugin.seo.help.xImage"),
				},
			})
			.addText(fields.xImageAlt, {
				localized,
				ai: { enabled: false },
				details: {
					label: copy("admin:plugin.seo.field.xImageAlt"),
				},
			})
			.endCollapsible()
			// Indexing
			.addTab("indexingOptions", {
				details: {
					label: copy("admin:plugin.seo.group.indexing"),
				},
			})
			.addText(fields.canonicalUrl, {
				localized,
				ai: { enabled: false },
				details: {
					label: copy("admin:plugin.seo.field.canonicalUrl"),
					description: copy("admin:plugin.seo.help.canonicalUrl"),
				},
				validation: { zod: canonicalUrlSchema },
			})
			.addSelect(fields.indexing, {
				localized,
				default: "index",
				options: [
					{
						value: "index",
						label: copy("admin:plugin.seo.option.index"),
					},
					{
						value: "noindex",
						label: copy("admin:plugin.seo.option.noindex"),
					},
				],
				details: {
					label: copy("admin:plugin.seo.field.indexing"),
				},
				ui: { width: 6 },
			})
			.addSelect(fields.following, {
				localized,
				default: "follow",
				options: [
					{
						value: "follow",
						label: copy("admin:plugin.seo.option.follow"),
					},
					{
						value: "nofollow",
						label: copy("admin:plugin.seo.option.nofollow"),
					},
				],
				details: {
					label: copy("admin:plugin.seo.field.following"),
					description: copy("admin:plugin.seo.help.following"),
				},
				ui: { width: 6 },
			})
			.addCollapsible("previewControls", {
				output: "inline",
				defaultOpen: false,
				details: {
					label: copy("admin:plugin.seo.group.robots"),
				},
			})
			.addNumber(fields.maxSnippet, {
				localized,
				details: {
					label: copy("admin:plugin.seo.field.maxSnippet"),
					description: copy("admin:plugin.seo.help.maxSnippet"),
				},
				validation: { zod: previewLimitSchema },
			})
			.addSelect(fields.maxImagePreview, {
				localized,
				default: "default",
				options: [
					{
						value: "default",
						label: copy("admin:plugin.seo.option.default"),
					},
					{
						value: "none",
						label: copy("admin:plugin.seo.option.none"),
					},
					{
						value: "standard",
						label: copy("admin:plugin.seo.option.standard"),
					},
					{
						value: "large",
						label: copy("admin:plugin.seo.option.large"),
					},
				],
				details: {
					label: copy("admin:plugin.seo.field.maxImagePreview"),
					description: copy("admin:plugin.seo.help.maxImagePreview"),
				},
			})
			.addNumber(fields.maxVideoPreview, {
				localized,
				details: {
					label: copy("admin:plugin.seo.field.maxVideoPreview"),
					description: copy("admin:plugin.seo.help.maxVideoPreview"),
				},
				validation: { zod: previewLimitSchema },
			})
			.endCollapsible()
			// Structured data
			.addTab("schema", {
				details: {
					label: copy("admin:plugin.seo.group.schema"),
				},
			})
			.addJSON(fields.structuredData, {
				localized,
				ai: { enabled: false },
				details: {
					label: copy("admin:plugin.seo.field.structuredData"),
					description: copy("admin:plugin.seo.help.structuredData"),
				},
				validation: { zod: structuredDataSchema },
			})
			.addCollapsible("extra", {
				output: "inline",
				defaultOpen: false,
				details: {
					label: copy("admin:plugin.seo.group.metadata"),
				},
			})
			.addRepeater(fields.metadata, {
				details: {
					label: copy("admin:plugin.seo.field.metadata"),
					description: copy("admin:plugin.seo.help.metadata"),
				},
			})
			.addSelect(fields.attribute, {
				localized: false,
				default: "name",
				options: [
					{
						value: "name",
						label: copy("admin:plugin.seo.option.name"),
					},
					{
						value: "property",
						label: copy("admin:plugin.seo.option.property"),
					},
				],
				validation: { required: true },
				details: {
					label: copy("admin:plugin.seo.field.attribute"),
				},
				ui: { width: 4 },
			})
			.addText(fields.name, {
				localized: false,
				ai: { enabled: false },
				details: {
					label: copy("admin:plugin.seo.field.name"),
				},
				validation: { required: true, zod: metadataNameSchema },
				ui: { width: 8 },
			})
			.addText(fields.content, {
				localized,
				ai: { enabled: false },
				details: {
					label: copy("admin:plugin.seo.field.content"),
				},
				validation: { required: true, zod: nonBlankTextSchema },
			})
			.endRepeater()
			.endCollapsible()
	);
};
export default createSeoBrick;
