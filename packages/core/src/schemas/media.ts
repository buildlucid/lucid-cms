import z from "zod";
import { queryString } from "../utils/swagger/index.js";
import defaultQuery, { filterSchemas } from "./default-query.js";
import type { ControllerSchema } from "../types.js";

const mediaResponseSchema = z.object({
	id: z.number().meta({ description: "Media ID", example: 1 }),
	key: z.string().meta({
		description: "Media key",
		example: "2024/09/5ttogd-placeholder-image.png",
	}),
	url: z.string().meta({
		description: "Media URL",
		example: "https://example.com/cdn/v1/2024/09/5ttogd-placeholder-image.png",
	}),
	title: z
		.array(
			z.object({
				localeCode: z
					.string()
					.meta({ description: "Locale code", example: "en" }),
				value: z.string().meta({
					description: "Title value",
				}),
			}),
		)
		.meta({
			description: "Translated titles",
		}),
	alt: z
		.array(
			z.object({
				localeCode: z
					.string()
					.meta({ description: "Locale code", example: "en" }),
				value: z.string().meta({
					description: "Alt text value",
				}),
			}),
		)
		.meta({
			description: "Translated alt texts",
		}),
	type: z.string().meta({ description: "Media type", example: "image" }),
	meta: z
		.object({
			mimeType: z
				.string()
				.meta({ description: "MIME type", example: "image/jpeg" }),
			extension: z
				.string()
				.meta({ description: "File extension", example: "jpeg" }),
			fileSize: z
				.number()
				.meta({ description: "File size in bytes", example: 100 }),
			width: z
				.number()
				.nullable()
				.meta({ description: "Image width", example: 100 }),
			height: z
				.number()
				.nullable()
				.meta({ description: "Image height", example: 100 }),
			blurHash: z.string().nullable().meta({
				description: "BlurHash for image previews",
				example: "AQABAAAABAAAAgAA...",
			}),
			averageColour: z.string().nullable().meta({
				description: "Average colour of the image",
				example: "rgba(255, 255, 255, 1)",
			}),
			isDark: z.boolean().nullable().meta({
				description: "Whether the image is predominantly dark",
				example: true,
			}),
			isLight: z.boolean().nullable().meta({
				description: "Whether the image is predominantly light",
				example: true,
			}),
		})
		.meta({
			description: "Media metadata",
		}),
	createdAt: z.string().meta({
		description: "Creation timestamp",
		example: "2022-01-01T00:00:00Z",
	}),
	updatedAt: z.string().meta({
		description: "Last update timestamp",
		example: "2022-01-01T00:00:00Z",
	}),
});

const presignedUrlResponseSchema = z.object({
	url: z.string().meta({
		description: "The presigned URL to upload media to",
		example: "https://example.com/cdn/v1/key",
	}),
	key: z.string().meta({
		description: "The media key",
		example: "2024/09/5ttogd-placeholder-image.png",
	}),
});

export const controllerSchemas = {
	getMultiple: {
		query: {
			string: z
				.object({
					"filter[title]": queryString.schema.filter(false, "Thumbnail"),
					"filter[key]": queryString.schema.filter(false, "thumbnail-2022"),
					"filter[mimeType]": queryString.schema.filter(
						true,
						"image/png,image/jpg",
					),
					"filter[type]": queryString.schema.filter(true, "document"),
					"filter[extension]": queryString.schema.filter(true, "jpg,png"),
					sort: queryString.schema.sort(
						"createdAt,updatedAt,title,mimeType,extension",
					),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						title: filterSchemas.single.optional(),
						key: filterSchemas.single.optional(),
						mimeType: filterSchemas.union.optional(),
						type: filterSchemas.union.optional(),
						extension: filterSchemas.union.optional(),
					})
					.optional(),
				sort: z
					.array(
						z.object({
							key: z.enum([
								"createdAt",
								"updatedAt",
								"title",
								"fileSize",
								"width",
								"height",
								"mimeType",
								"extension",
							]),
							value: z.enum(["asc", "desc"]),
						}),
					)
					.optional(),
				page: defaultQuery.page,
				perPage: defaultQuery.perPage,
			}),
		},
		params: undefined,
		body: undefined,
		response: z.array(mediaResponseSchema),
	} satisfies ControllerSchema,
	getSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().meta({
				description: "The media ID",
				example: 1,
			}),
		}),
		response: mediaResponseSchema,
	} satisfies ControllerSchema,
	deleteSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().meta({
				description: "The media ID",
				example: 1,
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	updateSingle: {
		body: z.object({
			key: z
				.string()
				.meta({
					description: "The media key",
					example: "2024/09/5ttogd-placeholder-image.png",
				})
				.optional(),
			fileName: z
				.string()
				.meta({
					description: "The filename",
					example: "funny-cats.jpg",
				})
				.optional(),
			title: z
				.array(
					z.object({
						localeCode: z
							.string()
							.meta({ description: "Locale code", example: "en" }),
						value: z.string().nullable().meta({
							description: "Title value",
						}),
					}),
				)
				.optional(),
			alt: z
				.array(
					z.object({
						localeCode: z
							.string()
							.meta({ description: "Locale code", example: "en" }),
						value: z.string().nullable().meta({
							description: "Alt text value",
						}),
					}),
				)
				.optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().meta({
				description: "The media ID",
				example: 1,
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	clearSingleProcessed: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().meta({
				description: "The media ID",
				example: 1,
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	clearAllProcessed: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
	getPresignedUrl: {
		body: z.object({
			fileName: z.string().meta({
				description: "The file name",
				example: "funny-cats.jpg",
			}),
			mimeType: z.string().meta({
				description: "The media's mime type",
				example: "image/jpeg",
			}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: presignedUrlResponseSchema,
	} satisfies ControllerSchema,
	createSingle: {
		body: z.object({
			key: z.string().meta({
				description: "The media key",
				example: "2024/09/5ttogd-placeholder-image.png",
			}),
			fileName: z.string().meta({
				description: "The filename",
				example: "funny-cats.jpg",
			}),
			title: z
				.array(
					z.object({
						localeCode: z
							.string()
							.meta({ description: "Locale code", example: "en" }),
						value: z.string().nullable().meta({
							description: "Title value",
						}),
					}),
				)
				.optional(),
			alt: z
				.array(
					z.object({
						localeCode: z
							.string()
							.meta({ description: "Locale code", example: "en" }),
						value: z.string().nullable().meta({
							description: "Alt text value",
						}),
					}),
				)
				.optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
};

export type GetMultipleQueryParams = z.infer<
	typeof controllerSchemas.getMultiple.query.formatted
>;
