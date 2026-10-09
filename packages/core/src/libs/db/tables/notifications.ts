import type { Generated, JSONColumnType } from "kysely";
import z from "zod";
import { translatableCopySchema } from "../../i18n/copy.js";
import type { TranslatableCopy } from "../../i18n/types.js";
import { defineTable } from "../client/table/definition.js";
import type {
	BooleanInt,
	TimestampImmutable,
	TimestampMutable,
	TimestampRequired,
} from "../types.js";

export const notificationLevelSchema = z.enum([
	"info",
	"success",
	"warning",
	"error",
]);

export const notificationsTable = defineTable(
	"lucid_notifications",
	(adapter) => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			type: {
				schema: z.string(),
				type: "text",
			},
			key: {
				schema: z.string().nullable(),
				type: "text",
			},
			category: {
				schema: z.string(),
				type: "text",
			},
			level: {
				schema: notificationLevelSchema,
				type: "text",
			},
			action_required: {
				schema: z.union([
					z.literal(adapter.config.defaults.boolean.true),
					z.literal(adapter.config.defaults.boolean.false),
				]),
				type: "boolean",
			},
			title: {
				schema: translatableCopySchema,
				type: "json",
			},
			body: {
				schema: translatableCopySchema.nullable(),
				type: "json",
			},
			href: {
				schema: z.string().nullable(),
				type: "text",
			},
			data: {
				schema: z.record(z.string(), z.unknown()),
				type: "json",
			},
			fingerprint: {
				schema: z.string().nullable(),
				type: "text",
			},
			actor_user_id: {
				schema: z.number().nullable(),
				type: "integer",
			},
			actor_run_id: {
				schema: z.uuid().nullable(),
				type: "text",
			},
			resolved_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			created_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
			updated_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
		results: {
			read_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
			},
			archived_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
			},
		},
		query: {
			filters: {
				type: "lucid_notifications.type",
				category: "lucid_notifications.category",
				level: "lucid_notifications.level",
			},
			sorts: {
				updatedAt: "lucid_notifications.updated_at",
				createdAt: "lucid_notifications.created_at",
			},
		},
	}),
);

export type NotificationLevel = z.infer<typeof notificationLevelSchema>;

export interface LucidNotifications {
	id: Generated<number>;
	type: string;
	/** Identifies the same event over time, so sending it again updates or reopens it. */
	key: string | null;
	category: string;
	level: NotificationLevel;
	action_required: BooleanInt;
	title: JSONColumnType<TranslatableCopy, TranslatableCopy, TranslatableCopy>;
	body: JSONColumnType<
		TranslatableCopy | null,
		TranslatableCopy | null,
		TranslatableCopy | null
	>;
	href: string | null;
	data: JSONColumnType<
		Record<string, unknown>,
		Record<string, unknown>,
		Record<string, unknown>
	>;
	/** Sender-supplied marker. Recipients are told again when it changes. */
	fingerprint: string | null;
	actor_user_id: number | null;
	/** The agent run that acted, for `actor_user_id` or the system. */
	actor_run_id: string | null;
	resolved_at: TimestampMutable;
	created_at: TimestampImmutable;
	updated_at: TimestampRequired;
}
