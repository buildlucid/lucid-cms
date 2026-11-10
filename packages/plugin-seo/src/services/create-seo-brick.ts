import { copy, defineBrick, field } from "@lucidcms/core";
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
	"Use only facts supported by the page's content. Be specific to this page, concise and natural. Avoid keyword stuffing, clickbait, repeated branding and invented claims, prices, offers or statistics. Plain text, without HTML or surrounding quotation marks. Length suggestions are editorial guidance, not ranking requirements.";

const altInstructions =
	"Describe the selected image for people who can't see it, in one short sentence. Set it whenever an image is chosen, and leave it empty otherwise.";

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
	};

	const descriptionOptions: FieldOptions<"textarea"> = {
		localized,
		validation: { zod: nonBlankTextSchema },
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

	return defineBrick({
		key: brickKey,
		details: {
			label: copy("admin:plugin.seo.brick.label"),
			description: copy("admin:plugin.seo.brick.description"),
		},
		ai: {
			instructions:
				"Search and share metadata for the page. Write the title and description from the page's own content. Social and X fields fall back to the search values, so leave them empty unless they need different wording or a different image.",
		},
		fields: [
			field.tab("search", {
				details: {
					label: copy("admin:plugin.seo.group.search"),
				},
				fields: [
					field.text(fields.title, {
						...titleOptions,
						details: {
							label: copy("admin:plugin.seo.field.title"),
						},
						ai: {
							instructions: `A descriptive title for search results, ideally 60 characters or fewer. ${copyInstructions}`,
						},
					}),
					field.textarea(fields.description, {
						...descriptionOptions,
						details: {
							label: copy("admin:plugin.seo.field.description"),
						},
						ai: {
							instructions: `Summarize the page's actual content and why it is useful to the reader, ideally 160 characters or fewer. ${copyInstructions}`,
						},
					}),
				],
			}),
			field.tab("social", {
				details: {
					label: copy("admin:plugin.seo.group.social"),
				},
				fields: [
					field.text(fields.socialTitle, {
						...titleOptions,
						details: {
							label: copy("admin:plugin.seo.field.socialTitle"),
						},
						ai: {
							instructions: `Optional title for social shares. Empty uses the SEO title. ${copyInstructions}`,
						},
					}),
					field.textarea(fields.socialDescription, {
						...descriptionOptions,
						details: {
							label: copy("admin:plugin.seo.field.socialDescription"),
						},
						ai: {
							instructions: `Optional description for social shares. Empty uses the meta description. ${copyInstructions}`,
						},
					}),
					field.media(fields.socialImage, {
						...imageOptions,
						details: {
							label: copy("admin:plugin.seo.field.socialImage"),
							description: copy("admin:plugin.seo.help.socialImage"),
						},
					}),
					field.text(fields.socialImageAlt, {
						localized,
						details: {
							label: copy("admin:plugin.seo.field.socialImageAlt"),
						},
						ai: { instructions: altInstructions },
					}),
					field.select(fields.ogType, {
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
					}),
					field.collapsible("x", {
						output: "inline",
						defaultOpen: false,
						details: {
							label: copy("admin:plugin.seo.group.x"),
							description: copy("admin:plugin.seo.group.x.help"),
						},
						fields: [
							field.select(fields.xCard, {
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
							}),
							field.text(fields.xTitle, {
								...titleOptions,
								details: {
									label: copy("admin:plugin.seo.field.xTitle"),
								},
								ai: {
									instructions: `Optional title for X. Empty uses the social title, then the SEO title. ${copyInstructions}`,
								},
							}),
							field.textarea(fields.xDescription, {
								...descriptionOptions,
								details: {
									label: copy("admin:plugin.seo.field.xDescription"),
								},
								ai: {
									instructions: `Optional description for X. Empty uses the social description, then the meta description. ${copyInstructions}`,
								},
							}),
							field.media(fields.xImage, {
								...imageOptions,
								details: {
									label: copy("admin:plugin.seo.field.xImage"),
									description: copy("admin:plugin.seo.help.xImage"),
								},
							}),
							field.text(fields.xImageAlt, {
								localized,
								details: {
									label: copy("admin:plugin.seo.field.xImageAlt"),
								},
								ai: { instructions: altInstructions },
							}),
						],
					}),
				],
			}),
			field.tab("indexingOptions", {
				details: {
					label: copy("admin:plugin.seo.group.indexing"),
				},
				fields: [
					field.text(fields.canonicalUrl, {
						localized,
						details: {
							label: copy("admin:plugin.seo.field.canonicalUrl"),
							description: copy("admin:plugin.seo.help.canonicalUrl"),
						},
						ai: {
							instructions:
								"Leave empty unless the person asks for a specific canonical URL.",
						},
						validation: { zod: canonicalUrlSchema },
					}),
					field.select(fields.indexing, {
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
					}),
					field.select(fields.following, {
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
					}),
					field.collapsible("previewControls", {
						output: "inline",
						defaultOpen: false,
						details: {
							label: copy("admin:plugin.seo.group.robots"),
						},
						fields: [
							field.number(fields.maxSnippet, {
								localized,
								details: {
									label: copy("admin:plugin.seo.field.maxSnippet"),
									description: copy("admin:plugin.seo.help.maxSnippet"),
								},
								validation: { zod: previewLimitSchema },
							}),
							field.select(fields.maxImagePreview, {
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
							}),
							field.number(fields.maxVideoPreview, {
								localized,
								details: {
									label: copy("admin:plugin.seo.field.maxVideoPreview"),
									description: copy("admin:plugin.seo.help.maxVideoPreview"),
								},
								validation: { zod: previewLimitSchema },
							}),
						],
					}),
				],
			}),
			field.tab("schema", {
				details: {
					label: copy("admin:plugin.seo.group.schema"),
				},
				fields: [
					field.json(fields.structuredData, {
						localized,
						details: {
							label: copy("admin:plugin.seo.field.structuredData"),
							description: copy("admin:plugin.seo.help.structuredData"),
						},
						validation: { zod: structuredDataSchema },
					}),
					field.collapsible("extra", {
						output: "inline",
						defaultOpen: false,
						details: {
							label: copy("admin:plugin.seo.group.metadata"),
						},
						fields: [
							field.repeater(fields.metadata, {
								details: {
									label: copy("admin:plugin.seo.field.metadata"),
									description: copy("admin:plugin.seo.help.metadata"),
								},
								fields: [
									field.select(fields.attribute, {
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
									}),
									field.text(fields.name, {
										localized: false,
										details: {
											label: copy("admin:plugin.seo.field.name"),
										},
										validation: { required: true, zod: metadataNameSchema },
										ui: { width: 8 },
									}),
									field.text(fields.content, {
										localized,
										details: {
											label: copy("admin:plugin.seo.field.content"),
										},
										validation: { required: true, zod: nonBlankTextSchema },
									}),
								],
							}),
						],
					}),
				],
			}),
		],
	});
};
export default createSeoBrick;
