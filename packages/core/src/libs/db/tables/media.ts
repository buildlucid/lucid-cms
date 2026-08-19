import type { ColumnType, Generated, JSONColumnType } from "kysely";
import z from "zod";
import type { MediaOrigin, MediaType } from "../../../types/response.js";
import { defineTable } from "../client/table/definition.js";
import type {
	BooleanInt,
	TimestampImmutable,
	TimestampMutable,
} from "../types.js";

export const mediaTable = defineTable("lucid_media", (adapter) => ({
	columns: {
		id: {
			schema: z.number(),
			type: "primary",
		},
		key: {
			schema: z.string(),
			type: "text",
		},
		folder_id: {
			schema: z.number().nullable(),
			type: "integer",
		},
		parent_media_id: {
			schema: z.number().nullable(),
			type: "integer",
		},
		relation_type: {
			schema: z.enum(["crop", "poster"]).nullable(),
			type: "text",
		},
		e_tag: {
			schema: z.string().nullable(),
			type: "text",
		},
		status: {
			schema: z.enum(["processing", "ready", "failed"]),
			type: "text",
		},
		storage_adapter_key: {
			schema: z.string(),
			type: "text",
		},
		storage_adapter_reference: {
			schema: z.string().nullable(),
			type: "text",
		},
		storage_adapter_data: {
			schema: z.record(z.string(), z.unknown()).nullable(),
			type: "json",
		},
		origin: {
			schema: z.enum(["human", "ai_generated", "ai_modified"]),
			type: "text",
		},
		ai_generation_id: {
			schema: z.number().nullable(),
			type: "integer",
		},
		public: {
			schema: z.union([
				z.literal(adapter.config.defaults.boolean.true),
				z.literal(adapter.config.defaults.boolean.false),
			]),
			type: "boolean",
		},
		type: {
			schema: z.enum([
				"image",
				"video",
				"audio",
				"document",
				"archive",
				"unknown",
			]),
			type: "text",
		},
		mime_type: {
			schema: z.string(),
			type: "text",
		},
		file_extension: {
			schema: z.string(),
			type: "text",
		},
		file_name: {
			schema: z.string().nullable(),
			type: "text",
		},
		file_size: {
			schema: z.number(),
			type: "integer",
		},
		width: {
			schema: z.number().nullable(),
			type: "integer",
		},
		height: {
			schema: z.number().nullable(),
			type: "integer",
		},
		focal_x: {
			schema: z.number().nullable(),
			type: "integer",
		},
		focal_y: {
			schema: z.number().nullable(),
			type: "integer",
		},
		crop_x: {
			schema: z.number().nullable(),
			type: "real",
		},
		crop_y: {
			schema: z.number().nullable(),
			type: "real",
		},
		crop_width: {
			schema: z.number().nullable(),
			type: "real",
		},
		crop_height: {
			schema: z.number().nullable(),
			type: "real",
		},
		crop_rotation: {
			schema: z.number().nullable(),
			type: "real",
		},
		crop_skew_x: {
			schema: z.number().nullable(),
			type: "real",
		},
		crop_skew_y: {
			schema: z.number().nullable(),
			type: "real",
		},
		blur_hash: {
			schema: z.string().nullable(),
			type: "text",
		},
		average_color: {
			schema: z.string().nullable(),
			type: "text",
		},
		base64: {
			schema: z.string().nullable().optional(),
			type: "text",
		},
		is_dark: {
			schema: z
				.union([
					z.literal(adapter.config.defaults.boolean.true),
					z.literal(adapter.config.defaults.boolean.false),
				])
				.nullable(),
			type: "boolean",
		},
		is_light: {
			schema: z
				.union([
					z.literal(adapter.config.defaults.boolean.true),
					z.literal(adapter.config.defaults.boolean.false),
				])
				.nullable(),
			type: "boolean",
		},
		custom_meta: {
			schema: z.string().nullable(),
			type: "text",
		},
		is_hidden: {
			schema: z.union([
				z.literal(adapter.config.defaults.boolean.true),
				z.literal(adapter.config.defaults.boolean.false),
			]),
			type: "boolean",
		},
		is_deleted: {
			schema: z.union([
				z.literal(adapter.config.defaults.boolean.true),
				z.literal(adapter.config.defaults.boolean.false),
			]),
			type: "boolean",
		},
		is_deleted_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		deleted_by: {
			schema: z.number().nullable(),
			type: "integer",
		},
		created_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		updated_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		updated_by: {
			schema: z.number().nullable(),
			type: "integer",
		},
		created_by: {
			schema: z.number().nullable(),
			type: "integer",
		},
	},
	results: {
		translations: {
			schema: z
				.array(
					z.object({
						title: z.string().nullable(),
						alt: z.string().nullable(),
						description: z.string().nullable(),
						summary: z.string().nullable(),
						locale_code: z.string().nullable(),
					}),
				)
				.optional(),
		},
		poster: {
			schema: z
				.array(
					z.object({
						id: z.number(),
						key: z.string(),
						status: z.enum(["processing", "ready", "failed"]),
						storage_adapter_key: z.string(),
						storage_adapter_reference: z.string().nullable(),
						storage_adapter_data: z.record(z.string(), z.unknown()).nullable(),
						public: z.union([
							z.literal(adapter.config.defaults.boolean.true),
							z.literal(adapter.config.defaults.boolean.false),
						]),
						origin: z.enum(["human", "ai_generated", "ai_modified"]),
						type: z.string(),
						mime_type: z.string(),
						file_extension: z.string(),
						file_name: z.string().nullable(),
						file_size: z.number(),
						width: z.number().nullable(),
						height: z.number().nullable(),
						focal_x: z.number().nullable(),
						focal_y: z.number().nullable(),
						crop_x: z.number().nullable().optional(),
						crop_y: z.number().nullable().optional(),
						crop_width: z.number().nullable().optional(),
						crop_height: z.number().nullable().optional(),
						crop_rotation: z.number().nullable().optional(),
						crop_skew_x: z.number().nullable().optional(),
						crop_skew_y: z.number().nullable().optional(),
						blur_hash: z.string().nullable(),
						average_color: z.string().nullable(),
						base64: z.string().nullable().optional(),
						is_dark: z
							.union([
								z.literal(adapter.config.defaults.boolean.true),
								z.literal(adapter.config.defaults.boolean.false),
							])
							.nullable(),
						is_light: z
							.union([
								z.literal(adapter.config.defaults.boolean.true),
								z.literal(adapter.config.defaults.boolean.false),
							])
							.nullable(),
						crop: z
							.array(
								z.object({
									id: z.number(),
									key: z.string(),
									status: z.enum(["processing", "ready", "failed"]),
									storage_adapter_key: z.string(),
									storage_adapter_reference: z.string().nullable(),
									storage_adapter_data: z
										.record(z.string(), z.unknown())
										.nullable(),
									public: z.union([
										z.literal(adapter.config.defaults.boolean.true),
										z.literal(adapter.config.defaults.boolean.false),
									]),
									origin: z.enum(["human", "ai_generated", "ai_modified"]),
									type: z.string(),
									mime_type: z.string(),
									file_extension: z.string(),
									file_name: z.string().nullable(),
									file_size: z.number(),
									width: z.number().nullable(),
									height: z.number().nullable(),
									focal_x: z.number().nullable(),
									focal_y: z.number().nullable(),
									crop_x: z.number(),
									crop_y: z.number(),
									crop_width: z.number(),
									crop_height: z.number(),
									crop_rotation: z.number(),
									crop_skew_x: z.number(),
									crop_skew_y: z.number(),
									blur_hash: z.string().nullable(),
									average_color: z.string().nullable(),
									base64: z.string().nullable().optional(),
									is_dark: z
										.union([
											z.literal(adapter.config.defaults.boolean.true),
											z.literal(adapter.config.defaults.boolean.false),
										])
										.nullable(),
									is_light: z
										.union([
											z.literal(adapter.config.defaults.boolean.true),
											z.literal(adapter.config.defaults.boolean.false),
										])
										.nullable(),
								}),
							)
							.optional(),
						translations: z
							.array(
								z.object({
									title: z.string().nullable().optional(),
									alt: z.string().nullable(),
									description: z.string().nullable().optional(),
									summary: z.string().nullable().optional(),
									locale_code: z.string().nullable(),
								}),
							)
							.optional(),
					}),
				)
				.optional(),
		},
		crop: {
			schema: z
				.array(
					z.object({
						id: z.number(),
						key: z.string(),
						status: z.enum(["processing", "ready", "failed"]),
						storage_adapter_key: z.string(),
						storage_adapter_reference: z.string().nullable(),
						storage_adapter_data: z.record(z.string(), z.unknown()).nullable(),
						public: z.union([
							z.literal(adapter.config.defaults.boolean.true),
							z.literal(adapter.config.defaults.boolean.false),
						]),
						origin: z.enum(["human", "ai_generated", "ai_modified"]),
						type: z.string(),
						mime_type: z.string(),
						file_extension: z.string(),
						file_name: z.string().nullable(),
						file_size: z.number(),
						width: z.number().nullable(),
						height: z.number().nullable(),
						focal_x: z.number().nullable(),
						focal_y: z.number().nullable(),
						crop_x: z.number(),
						crop_y: z.number(),
						crop_width: z.number(),
						crop_height: z.number(),
						crop_rotation: z.number(),
						crop_skew_x: z.number(),
						crop_skew_y: z.number(),
						blur_hash: z.string().nullable(),
						average_color: z.string().nullable(),
						base64: z.string().nullable().optional(),
						is_dark: z
							.union([
								z.literal(adapter.config.defaults.boolean.true),
								z.literal(adapter.config.defaults.boolean.false),
							])
							.nullable(),
						is_light: z
							.union([
								z.literal(adapter.config.defaults.boolean.true),
								z.literal(adapter.config.defaults.boolean.false),
							])
							.nullable(),
					}),
				)
				.optional(),
		},
	},
	query: {
		filters: {
			key: "key",
			status: "status",
			mimeType: "mime_type",
			type: "type",
			extension: "file_extension",
			folderId: "folder_id",
			isDeleted: "is_deleted",
			deletedBy: "deleted_by",
			public: "public",
			isHidden: "is_hidden",
			origin: "origin",
			fileSize: "file_size",
			width: "width",
			height: "height",
			createdAt: "created_at",
			updatedAt: "updated_at",
		},
		sorts: {
			createdAt: "created_at",
			updatedAt: "updated_at",
			fileSize: "file_size",
			width: "width",
			height: "height",
			mimeType: "mime_type",
			extension: "file_extension",
			deletedBy: "deleted_by",
			isDeletedAt: "is_deleted_at",
		},
	} as const,
}));

export interface LucidMedia {
	id: Generated<number>;
	key: string;
	folder_id: number | null;
	parent_media_id: number | null;
	relation_type: "crop" | "poster" | null;
	e_tag: string | null;
	status: Generated<"processing" | "ready" | "failed">;
	storage_adapter_key: string;
	storage_adapter_reference: string | null;
	storage_adapter_data: JSONColumnType<
		Record<string, unknown> | null,
		Record<string, unknown> | null,
		Record<string, unknown> | null
	>;
	origin: MediaOrigin;
	ai_generation_id: number | null;
	public: BooleanInt;
	type: MediaType;
	mime_type: string;
	file_extension: string;
	file_name: string | null;
	file_size: number;
	width: number | null;
	height: number | null;
	focal_x: number | null;
	focal_y: number | null;
	crop_x: number | null;
	crop_y: number | null;
	crop_width: number | null;
	crop_height: number | null;
	crop_rotation: number | null;
	crop_skew_x: number | null;
	crop_skew_y: number | null;
	blur_hash: string | null;
	average_color: string | null;
	base64: string | null;
	is_dark: BooleanInt | null;
	is_light: BooleanInt | null;
	custom_meta: string | null;
	is_hidden: ColumnType<BooleanInt, BooleanInt | undefined, BooleanInt>;
	is_deleted: ColumnType<BooleanInt, BooleanInt | undefined, BooleanInt>;
	is_deleted_at: TimestampMutable;
	deleted_by: number | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
	created_by: number | null;
	updated_by: number | null;
}
