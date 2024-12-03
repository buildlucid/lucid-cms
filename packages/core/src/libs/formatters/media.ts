import Formatter from "./index.js";
import { createCdnUrl } from "../../utils/media/index.js";
import type { BooleanInt } from "../../libs/db/types.js";
import type { MediaResponse, MediaType } from "../../types/response.js";

interface MediaPropsT {
	id: number;
	key: string;
	e_tag: string | null;
	type: string;
	mime_type: string;
	file_extension: string;
	file_size: number;
	width: number | null;
	height: number | null;
	title_translation_key_id: number | null;
	alt_translation_key_id: number | null;
	created_at: Date | string | null;
	updated_at: Date | string | null;
	blur_hash: string | null;
	average_colour: string | null;
	is_dark: BooleanInt | null;
	is_light: BooleanInt | null;
	title_translations?: Array<{
		value: string | null;
		locale_code: string | null;
	}>;
	alt_translations?: Array<{
		value: string | null;
		locale_code: string | null;
	}>;
	title_translation_value?: string | null;
	alt_translation_value?: string | null;
}

export default class MediaFormatter {
	formatMultiple = (props: {
		media: MediaPropsT[];
		host: string;
	}) => {
		return props.media.map((m) =>
			this.formatSingle({
				media: m,
				host: props.host,
			}),
		);
	};
	formatSingle = (props: {
		media: MediaPropsT;
		host: string;
	}): MediaResponse => {
		return {
			id: props.media.id,
			key: props.media.key,
			url: createCdnUrl(props.host, props.media.key),
			title:
				props.media.title_translations?.map((t) => ({
					value: t.value,
					localeCode: t.locale_code,
				})) ?? [],
			alt:
				props.media.alt_translations?.map((t) => ({
					value: t.value,
					localeCode: t.locale_code,
				})) ?? [],
			type: props.media.type as MediaType,
			meta: {
				mimeType: props.media.mime_type,
				extension: props.media.file_extension,
				fileSize: props.media.file_size,
				width: props.media.width,
				height: props.media.height,
				blurHash: props.media.blur_hash,
				averageColour: props.media.average_colour,
				isDark: props.media.is_dark,
				isLight: props.media.is_light,
			},
			createdAt: Formatter.formatDate(props.media.created_at),
			updatedAt: Formatter.formatDate(props.media.updated_at),
		};
	};
	static swagger = {
		type: "object",
		properties: {
			id: { type: "number", example: 1 },
			key: { type: "string", example: "placeholder-1708786317482" },
			url: { type: "string", example: "https://example.com/cdn/v1/key" },
			title: {
				type: "array",
				items: {
					type: "object",
					properties: {
						localeCode: { type: "string", example: "en" },
						value: { type: "string" },
					},
				},
			},
			alt: {
				type: "array",
				items: {
					type: "object",
					properties: {
						localeCode: { type: "string", example: "en" },
						value: {
							type: "string",
						},
					},
				},
			},
			type: { type: "string", example: "image" },
			meta: {
				type: "object",
				properties: {
					mimeType: { type: "string", example: "image/jpeg" },
					extension: { type: "string", example: "jpeg" },
					fileSize: { type: "number", example: 100 },
					width: { type: "number", example: 100, nullable: true },
					height: { type: "number", example: 100, nullable: true },
					blurHash: {
						type: "string",
						example: "AQABAAAABAAAAgAA...",
						nullable: true,
					},
					averageColour: {
						type: "string",
						example: "rgba(255, 255, 255, 1)",
						nullable: true,
					},
					isDark: {
						type: "number",
						example: 1,
						nullable: true,
					},
					isLight: {
						type: "number",
						example: 1,
						nullable: true,
					},
				},
			},
			createdAt: { type: "string", example: "2022-01-01T00:00:00Z" },
			updatedAt: { type: "string", example: "2022-01-01T00:00:00Z" },
		},
	};
	static presignedUrlSwagger = {
		type: "object",
		properties: {
			url: {
				type: "string",
				example: "https://example.com/cdn/v1/key",
			},
			key: {
				type: "string",
				example: "2024/09/5ttogd-placeholder-image.png",
			},
		},
	};
}
