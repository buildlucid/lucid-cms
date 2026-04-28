import z from "zod";
import type { ControllerSchema } from "../types.js";
import { queryFormatted, queryString } from "./helpers/querystring.js";

const mediaTranslationResponseSchema = z.object({
	localeCode: z
		.string()
		.meta({ description: "Locale code", example: "en" })
		.nullable(),
	value: z.string().meta({ description: "Translated value" }).nullable(),
});

const focalPointSchema = z.object({
	x: z.number().min(0).max(1).meta({
		description: "Horizontal focal point, normalized from 0 to 1",
		example: 0.5,
	}),
	y: z.number().min(0).max(1).meta({
		description: "Vertical focal point, normalized from 0 to 1",
		example: 0.5,
	}),
});

const mediaMetaResponseSchema = z
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
		focalPoint: focalPointSchema.nullable().meta({
			description: "Image focal point for presentation cropping",
		}),
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
	});

const uploadPartSchema = z.object({
	partNumber: z.number().int().positive(),
	etag: z.string().trim(),
	size: z.number().nonnegative().optional(),
});

const uploadSessionResponseSchema = z.discriminatedUnion("mode", [
	z.object({
		mode: z.literal("single"),
		key: z.string(),
		url: z.string(),
		headers: z.record(z.string(), z.string()).optional(),
	}),
	z.object({
		mode: z.literal("resumable"),
		key: z.string(),
		sessionId: z.string(),
		partSize: z.number(),
		expiresAt: z.string(),
		uploadedParts: z.array(uploadPartSchema),
	}),
]);

const uploadSessionParamsSchema = z.object({
	sessionId: z.string().trim().meta({
		description: "The upload session ID",
		example: "1e2230b6-8b62-4f31-a2d4-f4723d58d74a",
	}),
});

export const mediaEmbedResponseSchema = z.object({
	id: z.number().meta({ description: "Media ID", example: 2 }),
	key: z.string().meta({
		description: "Media key",
		example: "public/123e4567e89b12d3a456426614174000",
	}),
	url: z.string().meta({
		description: "Media URL",
		example:
			"https://example.com/cdn/public/123e4567e89b12d3a456426614174000/poster",
	}),
	fileName: z.string().nullable().meta({
		description: "Original file name",
		example: "placeholder-image.png",
	}),
	type: z.string().meta({ description: "Media type", example: "image" }),
	title: z.array(mediaTranslationResponseSchema).meta({
		description: "Translated titles",
	}),
	alt: z.array(mediaTranslationResponseSchema).meta({
		description: "Translated alt texts",
	}),
	description: z.array(mediaTranslationResponseSchema).meta({
		description: "Translated descriptions",
	}),
	summary: z.array(mediaTranslationResponseSchema).meta({
		description: "Translated summaries",
	}),
	meta: mediaMetaResponseSchema,
});

const mediaResponseSchema = z.object({
	id: z.number().meta({ description: "Media ID", example: 1 }),
	key: z.string().meta({
		description: "Media key",
		example: "public/123e4567e89b12d3a456426614174000",
	}),
	fileName: z.string().nullable().meta({
		description: "Original file name",
		example: "placeholder-image.png",
	}),
	folderId: z.number().nullable().meta({
		description: "Media folder ID",
		example: 1,
	}),
	poster: mediaEmbedResponseSchema
		.nullable()
		.meta({
			description: "Poster media data",
		})
		.optional(),
	url: z.string().meta({
		description: "Media URL",
		example:
			"https://example.com/cdn/public/123e4567e89b12d3a456426614174000/placeholder-image",
	}),
	public: z.boolean().meta({
		description:
			"Media visibility. Private media can only be accessed by authorized users and when shared",
		example: true,
	}),
	title: z.array(mediaTranslationResponseSchema).meta({
		description: "Translated titles",
	}),
	alt: z.array(mediaTranslationResponseSchema).meta({
		description: "Translated alt texts",
	}),
	description: z.array(mediaTranslationResponseSchema).meta({
		description: "Translated descriptions",
	}),
	summary: z.array(mediaTranslationResponseSchema).meta({
		description: "Translated summaries",
	}),
	type: z.string().meta({ description: "Media type", example: "image" }),
	meta: mediaMetaResponseSchema,
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
			id: z.string().trim().meta({
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
			id: z.string().trim().meta({
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
			id: z.string().trim().meta({
				description: "The media ID",
				example: 1,
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	deleteMultiplePermanently: {
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
			id: z.string().trim().meta({
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
				.trim()
				.meta({
					description: "The media key",
					example: "public/123e4567e89b12d3a456426614174000",
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
				.trim()
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
							.trim()
							.meta({ description: "Locale code", example: "en" }),
						value: z.string().trim().nullable().meta({
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
							.trim()
							.meta({ description: "Locale code", example: "en" }),
						value: z.string().trim().nullable().meta({
							description: "Alt text value",
						}),
					}),
				)
				.optional(),
			description: z
				.array(
					z.object({
						localeCode: z
							.string()
							.trim()
							.meta({ description: "Locale code", example: "en" }),
						value: z.string().trim().nullable().meta({
							description: "Description value",
						}),
					}),
				)
				.optional(),
			summary: z
				.array(
					z.object({
						localeCode: z
							.string()
							.trim()
							.meta({ description: "Locale code", example: "en" }),
						value: z.string().trim().nullable().meta({
							description: "Summary value",
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
			focalPoint: focalPointSchema.nullable().optional().meta({
				description: "The image focal point",
			}),
			blurHash: z
				.string()
				.trim()
				.nullable()
				.meta({
					description: "The blur hash",
					example: "AQABAAAABAAAAgAA...",
				})
				.optional(),
			averageColor: z
				.string()
				.trim()
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
			posterId: z
				.number()
				.nullable()
				.meta({
					description: "The poster media ID",
					example: 1,
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
	createUploadSession: {
		body: z.object({
			fileName: z.string().trim().meta({
				description: "The file name",
				example: "funny-cats.jpg",
			}),
			mimeType: z.string().trim().meta({
				description: "The media's mime type",
				example: "image/jpeg",
			}),
			size: z.number().nonnegative().meta({
				description: "The file size in bytes",
				example: 10485760,
			}),
			public: z.boolean().meta({
				description: "Whether the media is public",
				example: true,
			}),
			temporary: z.boolean().optional().meta({
				description: "Whether the upload target should be temporary.",
				example: false,
			}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: uploadSessionResponseSchema,
	} satisfies ControllerSchema,
	getUploadSession: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: uploadSessionParamsSchema,
		response: uploadSessionResponseSchema,
	} satisfies ControllerSchema,
	getUploadPartUrls: {
		body: z.object({
			partNumbers: z.array(z.number().int().positive()).min(1),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: uploadSessionParamsSchema,
		response: z.object({
			parts: z.array(
				z.object({
					partNumber: z.number().int().positive(),
					url: z.string(),
					headers: z.record(z.string(), z.string()).optional(),
				}),
			),
		}),
	} satisfies ControllerSchema,
	completeUploadSession: {
		body: z.object({
			parts: z.array(uploadPartSchema).min(1),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: uploadSessionParamsSchema,
		response: z.object({
			key: z.string(),
		}),
	} satisfies ControllerSchema,
	abortUploadSession: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: uploadSessionParamsSchema,
		response: undefined,
	} satisfies ControllerSchema,
	createSingle: {
		body: z.object({
			key: z.string().trim().meta({
				description: "The media key",
				example: "public/123e4567e89b12d3a456426614174000",
			}),
			folderId: z
				.number()
				.nullable()
				.meta({
					description: "The media folder ID",
					example: 1,
				})
				.optional(),
			fileName: z.string().trim().meta({
				description: "The filename",
				example: "funny-cats.jpg",
			}),
			title: z
				.array(
					z.object({
						localeCode: z
							.string()
							.trim()
							.meta({ description: "Locale code", example: "en" }),
						value: z.string().trim().nullable().meta({
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
							.trim()
							.meta({ description: "Locale code", example: "en" }),
						value: z.string().trim().nullable().meta({
							description: "Alt text value",
						}),
					}),
				)
				.optional(),
			description: z
				.array(
					z.object({
						localeCode: z
							.string()
							.trim()
							.meta({ description: "Locale code", example: "en" }),
						value: z.string().trim().nullable().meta({
							description: "Description value",
						}),
					}),
				)
				.optional(),
			summary: z
				.array(
					z.object({
						localeCode: z
							.string()
							.trim()
							.meta({ description: "Locale code", example: "en" }),
						value: z.string().trim().nullable().meta({
							description: "Summary value",
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
			focalPoint: focalPointSchema.optional().meta({
				description: "The image focal point",
			}),
			blurHash: z
				.string()
				.trim()
				.meta({
					description: "The blur hash",
					example: "AQABAAAABAAAAgAA...",
				})
				.optional(),
			averageColor: z
				.string()
				.trim()
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
			posterId: z
				.number()
				.nullable()
				.meta({
					description: "The poster media ID",
					example: 1,
				})
				.optional(),
			isHidden: z
				.boolean()
				.meta({
					description: "Whether the media should be hidden from library lists",
					example: true,
				})
				.optional(),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: mediaResponseSchema,
	} satisfies ControllerSchema,
	client: {
		processMedia: {
			body: z
				.object({
					preset: z.string().trim().optional(),
					format: z.enum(["jpeg", "png", "webp", "avif"]).optional(),
				})
				.default({}),
			query: {
				string: undefined,
				formatted: undefined,
			},
			params: z.object({
				key: z.string().trim().meta({
					description: "The media key you wish to stream",
					example: "public/123e4567e89b12d3a456426614174000",
				}),
			}),
			response: z.object({
				url: z.string().meta({
					description: "The URL of the media",
					example:
						"https://example.com/cdn/public/123e4567e89b12d3a456426614174000/placeholder-image?preset=thumbnail&format=webp",
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
				id: z.string().trim().meta({
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
