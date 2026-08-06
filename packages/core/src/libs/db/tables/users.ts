import type { ColumnType, Generated } from "kysely";
import z from "zod";
import type { MediaPosterPropsT } from "../../formatters/media.js";
import { defineTable } from "../client/table/definition.js";
import type {
	BooleanInt,
	TimestampImmutable,
	TimestampMutable,
} from "../types.js";

export const usersTable = defineTable("lucid_users", (adapter) => ({
	columns: {
		id: {
			schema: z.number(),
			type: "primary",
		},
		super_admin: {
			schema: z.union([
				z.literal(adapter.config.defaults.boolean.true),
				z.literal(adapter.config.defaults.boolean.false),
			]),
			type: "boolean",
		},
		email: {
			schema: z.email(),
			type: "text",
		},
		username: {
			schema: z.string(),
			type: "text",
		},
		first_name: {
			schema: z.string().nullable(),
			type: "text",
		},
		last_name: {
			schema: z.string().nullable(),
			type: "text",
		},
		password: {
			schema: z.string().nullable(),
			type: "text",
		},
		secret: {
			schema: z.string(),
			type: "text",
		},
		triggered_password_reset: {
			schema: z.union([
				z.literal(adapter.config.defaults.boolean.true),
				z.literal(adapter.config.defaults.boolean.false),
			]),
			type: "boolean",
		},
		invitation_accepted: {
			schema: z.union([
				z.literal(adapter.config.defaults.boolean.true),
				z.literal(adapter.config.defaults.boolean.false),
			]),
			type: "boolean",
		},
		is_locked: {
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
		profile_picture_media_id: {
			schema: z.number().nullable().optional(),
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
	},
	results: {
		profile_picture: {
			schema: z
				.array(
					z.object({
						id: z.number(),
						key: z.string(),
						origin: z.enum(["human", "ai_generated", "ai_modified"]),
						folder_id: z.number().nullable(),
						e_tag: z.string().nullable(),
						type: z.string(),
						mime_type: z.string(),
						file_extension: z.string(),
						file_name: z.string().nullable(),
						file_size: z.number(),
						width: z.number().nullable(),
						height: z.number().nullable(),
						focal_x: z.number().nullable(),
						focal_y: z.number().nullable(),
						created_at: z.union([z.string(), z.date()]).nullable(),
						updated_at: z.union([z.string(), z.date()]).nullable(),
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
						is_deleted: z.union([
							z.literal(adapter.config.defaults.boolean.true),
							z.literal(adapter.config.defaults.boolean.false),
						]),
						is_deleted_at: z.union([z.string(), z.date()]).nullable(),
						deleted_by: z.number().nullable(),
						public: z.union([
							z.literal(adapter.config.defaults.boolean.true),
							z.literal(adapter.config.defaults.boolean.false),
						]),
						translations: z
							.array(
								z.object({
									title: z.string().nullable(),
									alt: z.string().nullable(),
									locale_code: z.string().nullable(),
								}),
							)
							.optional(),
					}),
				)
				.optional(),
		},
		content_profile_picture: {
			schema: z.array(z.custom<MediaPosterPropsT>()).optional(),
		},
		auth_providers: {
			schema: z
				.array(
					z.object({
						id: z.number(),
						provider_key: z.string(),
						provider_user_id: z.string(),
						linked_at: z.union([z.string(), z.date()]).nullable(),
					}),
				)
				.optional(),
		},
		roles: {
			schema: z
				.array(
					z.object({
						id: z.number(),
						name: z.string().nullable().optional(),
						translations: z
							.array(
								z.object({
									name: z.string().nullable(),
									locale_code: z.string().nullable(),
								}),
							)
							.optional(),
						permissions: z
							.array(
								z.object({
									permission: z.string(),
								}),
							)
							.optional(),
					}),
				)
				.optional(),
		},
		permissions: {},
		crop: {},
		translations: {},
		metadata: {},
	},
	query: {
		filters: {
			firstName: "lucid_users.first_name",
			lastName: "lucid_users.last_name",
			email: "lucid_users.email",
			username: "lucid_users.username",
			roleIds: "lucid_user_roles.role_id",
			id: "lucid_users.id",
			invitationAccepted: "lucid_users.invitation_accepted",
			superAdmin: "lucid_users.super_admin",
			triggerPasswordReset: "lucid_users.triggered_password_reset",
			isLocked: "lucid_users.is_locked",
			isDeleted: "lucid_users.is_deleted",
			deletedBy: "lucid_users.deleted_by",
			createdAt: "lucid_users.created_at",
			updatedAt: "lucid_users.updated_at",
		},
		sorts: {
			createdAt: "lucid_users.created_at",
			updatedAt: "lucid_users.updated_at",
			firstName: "lucid_users.first_name",
			lastName: "lucid_users.last_name",
			email: "lucid_users.email",
			username: "lucid_users.username",
			isLocked: "lucid_users.is_locked",
		},
		operators: {
			firstName: "contains",
			lastName: "contains",
			email: "contains",
			username: "contains",
		},
	} as const,
}));

export interface LucidUsers {
	id: Generated<number>;
	super_admin: ColumnType<BooleanInt, BooleanInt | undefined, BooleanInt>;
	email: string;
	username: string;
	first_name: string | null;
	last_name: string | null;
	password: ColumnType<string, string | undefined, string>;
	secret: ColumnType<string, string, string>;
	triggered_password_reset: ColumnType<
		BooleanInt,
		BooleanInt | undefined,
		BooleanInt
	>;
	invitation_accepted: ColumnType<
		BooleanInt,
		BooleanInt | undefined,
		BooleanInt
	>;
	is_locked: ColumnType<BooleanInt, BooleanInt | undefined, BooleanInt>;
	is_deleted: BooleanInt | null;
	is_deleted_at: TimestampMutable;
	deleted_by: number | null;
	profile_picture_media_id: number | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
}
