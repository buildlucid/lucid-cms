import z from "zod/v4";
import { queryFormatted, queryString } from "./helpers/querystring.js";
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
						title: queryFormatted.schema.filters.single.optional(),
						key: queryFormatted.schema.filters.single.optional(),
						mimeType: queryFormatted.schema.filters.union.optional(),
						type: queryFormatted.schema.filters.union.optional(),
						extension: queryFormatted.schema.filters.union.optional(),
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
				page: queryFormatted.schema.page,
				perPage: queryFormatted.schema.perPage,
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
			width: z
				.number()
				.nullable()
				.meta({
					description: "The image width",
					example: 100,
				})
				.optional(),
			height: z
				.number()
				.nullable()
				.meta({
					description: "The image height",
					example: 100,
				})
				.optional(),
			blurHash: z
				.string()
				.nullable()
				.meta({
					description: "The blur hash",
					example: "AQABAAAABAAAAgAA...",
				})
				.optional(),
			averageColour: z
				.string()
				.nullable()
				.meta({
					description: "The average colour",
					example: "rgba(255, 255, 255, 1)",
				})
				.optional(),
			isDark: z
				.boolean()
				.nullable()
				.meta({
					description: "Whether the image is dark",
					example: true,
				})
				.optional(),
			isLight: z
				.boolean()
				.nullable()
				.meta({
					description: "Whether the image is light",
					example: true,
				})
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
		response: z.object({
			url: z.string().meta({
				description: "The presigned URL to upload media to",
				example: "https://example.com/cdn/v1/key",
			}),
			key: z.string().meta({
				description: "The media key",
				example: "2024/09/5ttogd-placeholder-image.png",
			}),
			headers: z
				.record(z.string(), z.string())
				.meta({
					description: "The headers to use when uploading media",
					example: {
						"x-amz-meta-extension": "jpg",
					},
				})
				.optional(),
		}),
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
			width: z
				.number()
				.meta({
					description: "The image width",
					example: 100,
				})
				.optional(),
			height: z
				.number()
				.meta({
					description: "The image height",
					example: 100,
				})
				.optional(),
			blurHash: z
				.string()
				.meta({
					description: "The blur hash",
					example: "AQABAAAABAAAAgAA...",
				})
				.optional(),
			averageColour: z
				.string()
				.meta({
					description: "The average colour",
					example: "rgba(255, 255, 255, 1)",
				})
				.optional(),
			isDark: z
				.boolean()
				.meta({
					description: "Whether the image is dark",
					example: true,
				})
				.optional(),
			isLight: z
				.boolean()
				.meta({
					description: "Whether the image is light",
					example: true,
				})
				.optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
	client: {
		processMedia: {
			body: z.object({
				width: z
					.number()
					.refine((val) => val > 0, {
						message: "Width must be greater than 0",
					})
					.refine((val) => val <= 2000, {
						message: "Width must be less than or equal to 2000",
					})
					.optional(),
				height: z
					.number()
					.refine((val) => val > 0, {
						message: "Height must be greater than 0",
					})
					.refine((val) => val <= 2000, {
						message: "Height must be less than or equal to 2000",
					})
					.optional(),
				format: z.enum(["jpeg", "png", "webp", "avif"]).optional(),
				quality: z
					.number()
					.refine((val) => val > 0, {
						message: "Quality must be greater than 0",
					})
					.refine((val) => val <= 100, {
						message: "Quality must be less than or equal to 100",
					})
					.optional(),
			}),
			query: {
				string: undefined,
				formatted: undefined,
			},
			params: z.object({
				key: z.string().meta({
					description: "The media key you wish to stream",
					example: "2024/09/5ttogd-placeholder-image.png",
				}),
			}),
			response: z.object({
				url: z.string().meta({
					description: "The URL of the media",
					example:
						"https://example.com/cdn/v1/2024/09/5ttogd-placeholder-image.png",
				}),
			}),
		},
	},
};

export type GetMultipleQueryParams = z.infer<
	typeof controllerSchemas.getMultiple.query.formatted
>;
