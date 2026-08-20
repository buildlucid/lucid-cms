import z from "zod";
import type { ControllerSchema } from "../types.js";
import mediaAdapterDataSchema from "../utils/media/adapter-data.js";
import { queryFormatted, queryString } from "./helpers/querystring.js";

const mediaTranslationsResponseSchema = z
	.record(z.string(), z.string().nullable())
	.nullable()
	.meta({
		description: "Translated values keyed by locale code, or null when absent",
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

export const mediaOriginSchema = z.enum([
	"human",
	"ai_generated",
	"ai_modified",
]);

export const mediaStatusSchema = z.enum(["processing", "ready", "failed"]);

const mediaFileMetaResponseSchema = z.object({
	mimeType: z
		.string()
		.meta({ description: "MIME type", example: "image/jpeg" }),
	extension: z
		.string()
		.meta({ description: "File extension", example: "jpeg" }),
	fileSize: z
		.number()
		.meta({ description: "File size in bytes", example: 100 }),
});

const mediaImageMetaResponseSchema = mediaFileMetaResponseSchema
	.extend({
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
		base64: z.string().nullable().meta({
			description: "Tiny base64-encoded image placeholder",
			example:
				"data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoKAAcAAUAmJQBOgCH5AQAA",
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
		description: "Image file metadata",
	});

const mediaVideoMetaResponseSchema = mediaFileMetaResponseSchema.extend({
	width: z.number().nullable().meta({
		description: "Intrinsic video width",
		example: 1920,
	}),
	height: z.number().nullable().meta({
		description: "Intrinsic video height",
		example: 1080,
	}),
	duration: z.number().nullable().meta({
		description: "Video duration in seconds",
		example: 12.5,
	}),
});

const mediaAudioMetaResponseSchema = mediaFileMetaResponseSchema.extend({
	duration: z.number().nullable().meta({
		description: "Audio duration in seconds",
		example: 180.5,
	}),
});

const mediaCropStateSchema = z.object({
	x: z.number().min(0).max(1),
	y: z.number().min(0).max(1),
	width: z.number().positive().max(1),
	height: z.number().positive().max(1),
	rotation: z.number().min(-180).max(180),
	skewX: z.number().min(-45).max(45),
	skewY: z.number().min(-45).max(45),
});

const mediaFileIdentityResponseShape = {
	key: z.string().meta({
		description: "Storage key",
		example: "public/123e4567e89b12d3a456426614174000",
	}),
	url: z.string().meta({ description: "Public file URL" }),
	fileName: z.string().nullable().meta({
		description: "Original file name",
		example: "placeholder-image.png",
	}),
	delivery: z.object({
		adapter: z.string().meta({
			description: "Configured media delivery adapter key",
		}),
		data: mediaAdapterDataSchema.nullable().meta({
			description: "JSON-safe data explicitly exposed by the delivery adapter",
		}),
		supportsPresetQuery: z.boolean().meta({
			description: "Whether this URL accepts Lucid image preset queries",
		}),
	}),
};

const mediaImageOriginalResponseShape = {
	...mediaFileIdentityResponseShape,
	sourceType: z.literal("original"),
	meta: mediaImageMetaResponseSchema,
};

const mediaOriginalFileResponseSchema = z.object(
	mediaImageOriginalResponseShape,
);

const mediaFileResponseShape = {
	...mediaFileIdentityResponseShape,
	meta: mediaFileMetaResponseSchema,
};

const mediaAudioFileResponseShape = {
	...mediaFileIdentityResponseShape,
	meta: mediaAudioMetaResponseSchema,
};

const mediaVideoSourceResponseSchema = z.object({
	url: z.string(),
	mimeType: z.string(),
	kind: z.enum(["progressive", "hls", "dash"]),
});

const mediaVideoFileResponseShape = {
	...mediaFileIdentityResponseShape,
	meta: mediaVideoMetaResponseSchema,
	sources: z.array(mediaVideoSourceResponseSchema),
	thumbnail: z
		.object({
			url: z.string(),
			mimeType: z.string(),
			width: z.number().nullable(),
			height: z.number().nullable(),
		})
		.nullable(),
};

const mediaImageCropResponseShape = {
	...mediaFileIdentityResponseShape,
	sourceType: z.literal("crop"),
	crop: mediaCropStateSchema,
	meta: mediaImageMetaResponseSchema,
	original: mediaOriginalFileResponseSchema,
};

export const mediaCropInputSchema = z.object({
	key: z.string().trim(),
	fileName: z.string().trim(),
	width: z.number().positive(),
	height: z.number().positive(),
	focalPoint: focalPointSchema.nullable().optional(),
	blurHash: z.string().trim().nullable().optional(),
	averageColor: z.string().trim().nullable().optional(),
	base64: z.string().trim().nullable().optional(),
	isDark: z.boolean().nullable().optional(),
	isLight: z.boolean().nullable().optional(),
	state: mediaCropStateSchema
		.refine((state) => state.x + state.width <= 1.000001, {
			message: "Crop width must remain within the source image.",
		})
		.refine((state) => state.y + state.height <= 1.000001, {
			message: "Crop height must remain within the source image.",
		}),
});

const uploadPartSchema = z.object({
	partNumber: z.number().int().positive(),
	etag: z.string().trim(),
	size: z.number().nonnegative().optional(),
});

export const uploadSessionResponseSchema = z.discriminatedUnion("protocol", [
	z.object({
		protocol: z.literal("http"),
		key: z.string(),
		sessionId: z.string(),
		expiresAt: z.string(),
		request: z.object({
			url: z.string(),
			method: z.enum(["PUT", "POST"]),
			headers: z.record(z.string(), z.string()).optional(),
			body: z.union([
				z.object({ type: z.literal("raw") }),
				z.object({
					type: z.literal("form-data"),
					fileField: z.string(),
					fields: z.record(z.string(), z.string()),
				}),
			]),
		}),
	}),
	z.object({
		protocol: z.literal("multipart-parts"),
		key: z.string(),
		sessionId: z.string(),
		partSize: z.number(),
		expiresAt: z.string(),
		uploadedParts: z.array(uploadPartSchema),
	}),
	z.object({
		protocol: z.literal("tus"),
		key: z.string(),
		sessionId: z.string(),
		endpoint: z.string(),
		headers: z.record(z.string(), z.string()),
		metadata: z.record(z.string(), z.string()).optional(),
		expiresAt: z.string(),
	}),
]);

const getUploadSessionResponseSchema = z.discriminatedUnion("canResume", [
	z.object({
		canResume: z.literal(true),
		protocol: z.literal("multipart-parts"),
		key: z.string(),
		sessionId: z.string(),
		partSize: z.number(),
		expiresAt: z.string(),
		uploadedParts: z.array(uploadPartSchema),
	}),
	z.object({
		canResume: z.literal(true),
		protocol: z.literal("tus"),
		key: z.string(),
		sessionId: z.string(),
		endpoint: z.string(),
		headers: z.record(z.string(), z.string()),
		metadata: z.record(z.string(), z.string()).optional(),
		expiresAt: z.string(),
	}),
	z.object({
		canResume: z.literal(false),
		sessionId: z.string(),
		reason: z.enum([
			"protocol_not_resumable",
			"adapter_not_resumable",
			"adapter_changed",
		]),
	}),
]);

const uploadSessionParamsSchema = z.object({
	sessionId: z.string().trim().meta({
		description: "The upload session ID",
		example: "1e2230b6-8b62-4f31-a2d4-f4723d58d74a",
	}),
});

const mediaImagePreviewResponseShape = {
	id: z.number().meta({ description: "Media ID", example: 2 }),
	type: z.literal("image"),
	status: mediaStatusSchema,
	origin: mediaOriginSchema.meta({
		description: "The provenance origin of the media item",
		example: "human",
	}),
	title: mediaTranslationsResponseSchema,
	alt: mediaTranslationsResponseSchema,
};

export const mediaImagePreviewResponseSchema = z.discriminatedUnion(
	"sourceType",
	[
		z.object({
			...mediaImagePreviewResponseShape,
			...mediaImageOriginalResponseShape,
		}),
		z.object({
			...mediaImagePreviewResponseShape,
			...mediaImageCropResponseShape,
		}),
	],
);

const mediaPosterResponseShape = {
	id: z.number().meta({ description: "Media ID", example: 2 }),
	type: z.literal("image"),
	status: mediaStatusSchema,
	origin: mediaOriginSchema.meta({
		description: "The provenance origin of the media item",
		example: "human",
	}),
	alt: mediaTranslationsResponseSchema,
};

const mediaPosterResponseSchema = z.discriminatedUnion("sourceType", [
	z.object({
		...mediaPosterResponseShape,
		...mediaImageOriginalResponseShape,
	}),
	z.object({
		...mediaPosterResponseShape,
		...mediaImageCropResponseShape,
	}),
]);

const mediaIdResponseSchema = z
	.number()
	.meta({ description: "Media ID", example: 1 });

const mediaBaseResponseShape = {
	status: mediaStatusSchema,
	folderId: z.number().nullable().meta({
		description: "Media folder ID",
		example: 1,
	}),
	origin: mediaOriginSchema.meta({
		description: "The provenance origin of the media item",
		example: "human",
	}),
	title: mediaTranslationsResponseSchema,
};

const mediaStateResponseShape = {
	public: z.boolean().meta({
		description:
			"Media visibility. Private media can only be accessed by authorized users and when shared",
		example: true,
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
	createdAt: z.string().nullable().meta({
		description: "Creation timestamp",
		example: "2022-01-01T00:00:00Z",
	}),
	updatedAt: z.string().nullable().meta({
		description: "Last update timestamp",
		example: "2022-01-01T00:00:00Z",
	}),
};

const mediaImageResponseShape = {
	id: mediaIdResponseSchema,
	type: z.literal("image"),
	...mediaBaseResponseShape,
	alt: mediaTranslationsResponseSchema,
	...mediaStateResponseShape,
};

const mediaResponseSchema = z.union([
	z.discriminatedUnion("sourceType", [
		z.object({
			...mediaImageResponseShape,
			...mediaImageOriginalResponseShape,
		}),
		z.object({
			...mediaImageResponseShape,
			...mediaImageCropResponseShape,
		}),
	]),
	z.object({
		id: mediaIdResponseSchema,
		type: z.literal("video"),
		...mediaBaseResponseShape,
		description: mediaTranslationsResponseSchema,
		...mediaVideoFileResponseShape,
		poster: mediaPosterResponseSchema.nullable().meta({
			description: "Poster image data",
		}),
		...mediaStateResponseShape,
	}),
	z.object({
		id: mediaIdResponseSchema,
		type: z.literal("audio"),
		...mediaBaseResponseShape,
		description: mediaTranslationsResponseSchema,
		...mediaAudioFileResponseShape,
		...mediaStateResponseShape,
	}),
	z.object({
		id: mediaIdResponseSchema,
		type: z.literal("document"),
		...mediaBaseResponseShape,
		summary: mediaTranslationsResponseSchema,
		...mediaFileResponseShape,
		...mediaStateResponseShape,
	}),
	z.object({
		id: mediaIdResponseSchema,
		type: z.literal("archive"),
		...mediaBaseResponseShape,
		...mediaFileResponseShape,
		...mediaStateResponseShape,
	}),
	z.object({
		id: mediaIdResponseSchema,
		type: z.literal("unknown"),
		...mediaBaseResponseShape,
		...mediaFileResponseShape,
		...mediaStateResponseShape,
	}),
]);

const mediaGetMultipleQueryStringSchema = z
	.object({
		"filter[title]": queryString.schema.filter(false, {
			example: "Thumbnail",
		}),
		"filter[key]": queryString.schema.filter(false, {
			example: "thumbnail-2022",
		}),
		"filter[status]": queryString.schema.filter(true, {
			example: "ready,processing",
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
		"filter[origin]": queryString.schema.filter(true, {
			example: "human,ai_generated",
		}),
		"filter[fileSize]": queryString.schema.filter(false, {
			example: "1048576",
		}),
		"filter[width]": queryString.schema.filter(false, {
			example: "1920",
		}),
		"filter[height]": queryString.schema.filter(false, {
			example: "1080",
		}),
		"filter[createdAt]": queryString.schema.filter(false, {
			example: "2026-01-01T00:00:00Z",
		}),
		"filter[updatedAt]": queryString.schema.filter(false, {
			example: "2026-01-01T00:00:00Z",
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
			status: queryFormatted.schema.filters.union.optional(),
			mimeType: queryFormatted.schema.filters.union.optional(),
			folderId: queryFormatted.schema.filters.single.optional(),
			type: queryFormatted.schema.filters.union.optional(),
			extension: queryFormatted.schema.filters.union.optional(),
			isDeleted: queryFormatted.schema.filters.single.optional(),
			deletedBy: queryFormatted.schema.filters.union.optional(),
			public: queryFormatted.schema.filters.single.optional(),
			origin: queryFormatted.schema.filters.union.optional(),
			fileSize: queryFormatted.schema.filters.single.optional(),
			width: queryFormatted.schema.filters.single.optional(),
			height: queryFormatted.schema.filters.single.optional(),
			createdAt: queryFormatted.schema.filters.single.optional(),
			updatedAt: queryFormatted.schema.filters.single.optional(),
		})
		.optional(),
	filterOr: queryFormatted.schema.filterOr,
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
				direction: z.enum(["asc", "desc"]),
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
	requestDownload: {
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
		response: z.object({
			url: z.string().meta({
				description: "A direct download URL for the media item",
			}),
		}),
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
			crop: mediaCropInputSchema.nullable().optional(),
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
			origin: mediaOriginSchema.optional().meta({
				description: "The provenance origin of the media item",
				example: "ai_generated",
			}),
			aiGenerationRequestId: z.string().trim().optional().meta({
				description: "The AI generation request ID to link to this media item",
				example: "123e4567-e89b-12d3-a456-426614174000",
			}),
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
					description: "The image or video width",
					example: 100,
				})
				.optional(),
			height: z
				.number()
				.nullable()
				.meta({
					description: "The image or video height",
					example: 100,
				})
				.optional(),
			duration: z
				.number()
				.nonnegative()
				.nullable()
				.meta({
					description: "The audio or video duration in seconds",
					example: 12.5,
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
			base64: z
				.string()
				.trim()
				.nullable()
				.meta({
					description: "Tiny base64-encoded image placeholder",
					example:
						"data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoKAAcAAUAmJQBOgCH5AQAA",
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
		response: getUploadSessionResponseSchema,
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
			parts: z.array(uploadPartSchema).min(1).optional(),
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
			crop: mediaCropInputSchema.optional(),
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
			origin: mediaOriginSchema.meta({
				description: "The provenance origin of the media item",
				example: "human",
			}),
			aiGenerationRequestId: z.string().trim().optional().meta({
				description: "The AI generation request ID to link to this media item",
				example: "123e4567-e89b-12d3-a456-426614174000",
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
					description: "The image or video width",
					example: 100,
				})
				.optional(),
			height: z
				.number()
				.meta({
					description: "The image or video height",
					example: 100,
				})
				.optional(),
			duration: z
				.number()
				.nonnegative()
				.nullable()
				.meta({
					description: "The audio or video duration in seconds",
					example: 12.5,
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
			base64: z
				.string()
				.trim()
				.nullable()
				.meta({
					description: "Tiny base64-encoded image placeholder",
					example:
						"data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoKAAcAAUAmJQBOgCH5AQAA",
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
	content: {
		resolveUrl: {
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
						"https://example.com/cdn/public/123e4567e89b12d3a456426614174000/placeholder-image?preset=thumbnail-small&format=webp",
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
export type ContentGetMultipleQueryParams = z.infer<
	typeof controllerSchemas.content.getMultiple.query.formatted
>;
