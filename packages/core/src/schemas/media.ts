import z from "zod/v4";
import type { ControllerSchema } from "../types.js";
import { queryFormatted, queryString } from "./helpers/querystring.js";

const mediaResponseSchema = z.object({
	id: z.number().meta({ description: "Media ID", example: 1 }),
	key: z.string().meta({
		description: "Media key",
		example: "public/5ttogd-placeholder-image.png",
	}),
	folderId: z.number().nullable().meta({
		description: "Media folder ID",
		example: 1,
	}),
	url: z.string().meta({
		description: "Media URL",
		example: "https://example.com/cdn/public/5ttogd-placeholder-image.png",
	}),
	public: z.boolean().meta({
		description:
			"Media visibility. Private media can only be accessed by authorized users and when shared",
		example: true,
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
			averageColor: z.string().nullable().meta({
				description: "Average color of the image",
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
	isDeleted: z.boolean().nullable().meta({
		description: "Whether the media is deleted",
		example: true,
	}),
	isDeletedAt: z.string().nullable().meta({
		description: "The date the media was deleted",
		example: "2022-01-01T00:00:00Z",
	}),
	deletedBy: z.number().nullable().meta({
		description: "The user who deleted the media",
		example: 1,
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

const mediaGetMultipleQueryStringSchema = z
	.object({
		"filter[title]": queryString.schema.filter(false, {
			example: "Thumbnail",
		}),
		"filter[key]": queryString.schema.filter(false, {
			example: "thumbnail-2022",
		}),
		"filter[mimeType]": queryString.schema.filter(true, {
			example: "image/png,image/jpg",
		}),
		"filter[folderId]": queryString.schema.filter(false, {
			example: "1",
			nullable: true,
		}),
		"filter[type]": queryString.schema.filter(true, {
			example: "document",
		}),
		"filter[extension]": queryString.schema.filter(true, {
			example: "jpg,png",
		}),
		"filter[isDeleted]": queryString.schema.filter(false, {
			example: "true",
		}),
		"filter[deletedBy]": queryString.schema.filter(true, {
			example: "1",
		}),
		"filter[public]": queryString.schema.filter(false, {
			example: "true",
		}),
		sort: queryString.schema.sort(
			"createdAt,updatedAt,title,mimeType,extension",
		),
		page: queryString.schema.page,
		perPage: queryString.schema.perPage,
	})
	.meta(queryString.meta);

const mediaGetMultipleQueryFormattedSchema = z.object({
	filter: z
		.object({
			title: queryFormatted.schema.filters.single.optional(),
			key: queryFormatted.schema.filters.single.optional(),
			mimeType: queryFormatted.schema.filters.union.optional(),
			folderId: queryFormatted.schema.filters.single.optional(),
			type: queryFormatted.schema.filters.union.optional(),
			extension: queryFormatted.schema.filters.union.optional(),
			isDeleted: queryFormatted.schema.filters.single.optional(),
			deletedBy: queryFormatted.schema.filters.union.optional(),
			public: queryFormatted.schema.filters.single.optional(),
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
					"deletedBy",
					"isDeletedAt",
				]),
				value: z.enum(["asc", "desc"]),
			}),
		)
		.optional(),
	page: queryFormatted.schema.page,
	perPage: queryFormatted.schema.perPage,
});

export const controllerSchemas = {
	getMultiple: {
		query: {
			string: mediaGetMultipleQueryStringSchema,
			formatted: mediaGetMultipleQueryFormattedSchema,
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
	deleteSinglePermanently: {
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
	deleteBatch: {
		body: z.object({
			folderIds: z.array(z.number()).meta({
				description: "The media folder IDs",
				example: [1, 2, 3],
			}),
			mediaIds: z.array(z.number()).meta({
				description: "The media IDs",
				example: [1, 2, 3],
			}),
			recursiveMedia: z.boolean().meta({
				description: "Whether to delete all media in the folder",
				default: false,
				example: true,
			}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
	restoreMultiple: {
		body: z.object({
			ids: z.array(z.number()).meta({
				description: "The media IDs",
				example: [1, 2, 3],
			}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
	moveFolder: {
		body: z.object({
			folderId: z.number().nullable().meta({
				description: "The media folder ID",
				example: 1,
			}),
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
	updateSingle: {
		body: z.object({
			key: z
				.string()
				.meta({
					description: "The media key",
					example: "public/5ttogd-placeholder-image.png",
				})
				.optional(),
			public: z
				.boolean()
				.meta({
					description: "Whether the media is public",
					example: true,
				})
				.optional(),
			folderId: z
				.number()
				.nullable()
				.meta({
					description: "The media folder ID",
					example: 1,
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
			averageColor: z
				.string()
				.nullable()
				.meta({
					description: "The average color",
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
			isDeleted: z
				.boolean()
				.meta({
					description: "Whether the media is deleted",
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
			public: z.boolean().meta({
				description: "Whether the media is public",
				example: true,
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
				example: "https://example.com/cdn/key",
			}),
			key: z.string().meta({
				description: "The media key",
				example: "public/5ttogd-placeholder-image.png",
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
				example: "public/5ttogd-placeholder-image.png",
			}),
			folderId: z
				.number()
				.nullable()
				.meta({
					description: "The media folder ID",
					example: 1,
				})
				.optional(),
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
			averageColor: z
				.string()
				.meta({
					description: "The average color",
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
					example: "public/5ttogd-placeholder-image.png",
				}),
			}),
			response: z.object({
				url: z.string().meta({
					description: "The URL of the media",
					example:
						"https://example.com/cdn/public/5ttogd-placeholder-image.png",
				}),
			}),
		},
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
		getMultiple: {
			query: {
				string: mediaGetMultipleQueryStringSchema,
				formatted: mediaGetMultipleQueryFormattedSchema,
			},
			params: undefined,
			body: undefined,
			response: z.array(mediaResponseSchema),
		} satisfies ControllerSchema,
	},
};

export type GetMultipleQueryParams = z.infer<
	typeof controllerSchemas.getMultiple.query.formatted
>;
export type ClientGetMultipleQueryParams = z.infer<
	typeof controllerSchemas.client.getMultiple.query.formatted
>;
