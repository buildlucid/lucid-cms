import type { Generated, JSONColumnType } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable } from "../types.js";

export const alertsTable = defineTable("lucid_alerts", () => ({
	columns: {
		id: {
			schema: z.number(),
			type: "primary",
		},
		type: {
			schema: z.enum(["storage", "publish-request"]),
			type: "text",
		},
		level: {
			schema: z.enum(["info", "warning", "error", "critical"]),
			type: "text",
		},
		dedupe_key: {
			schema: z.string(),
			type: "text",
		},
		title: {
			schema: z.string(),
			type: "text",
		},
		message: {
			schema: z.string(),
			type: "text",
		},
		metadata: {
			schema: z.record(z.string(), z.unknown()),
			type: "json",
		},
		email_id: {
			schema: z.number().nullable(),
			type: "integer",
		},
		created_at: {
			schema: z.union([z.string(), z.date()]),
			type: "timestamp",
		},
	},
}));

export type AlertType = "storage" | "publish-request";

export type AlertLevel = "info" | "warning" | "error" | "critical";

export interface LucidAlerts {
	id: Generated<number>;
	type: AlertType;
	level: AlertLevel;
	dedupe_key: string;
	title: string;
	message: string;
	metadata: JSONColumnType<
		Record<string, unknown>,
		Record<string, unknown>,
		Record<string, unknown>
	>;
	email_id: number | null;
	created_at: TimestampImmutable;
}
