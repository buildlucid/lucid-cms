import type { Generated, JSONColumnType } from "kysely";
import z from "zod";
import { emailDeliveryStatusSchema } from "../../../schemas/email.js";
import type { EmailDeliveryStatus } from "../../email/types.js";
import { defineTable } from "../client/table/definition.js";
import type {
	BooleanInt,
	TimestampImmutable,
	TimestampMutable,
} from "../types.js";

export const emailTransactionsTable = defineTable(
	"lucid_email_transactions",
	(adapter) => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			email_id: {
				schema: z.number(),
				type: "integer",
			},
			delivery_status: {
				schema: emailDeliveryStatusSchema,
				type: "text",
			},
			external_message_id: {
				schema: z.string().nullable(),
				type: "text",
			},
			message: {
				schema: z.string().nullable(),
				type: "text",
			},
			strategy_identifier: {
				schema: z.string(),
				type: "text",
			},
			strategy_data: {
				schema: z.record(z.string(), z.unknown()).nullable(),
				type: "json",
			},
			simulate: {
				schema: z.union([
					z.literal(adapter.config.defaults.boolean.true),
					z.literal(adapter.config.defaults.boolean.false),
				]),
				type: "boolean",
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
	}),
);

export interface LucidEmailTransactions {
	id: Generated<number>;
	email_id: number;
	delivery_status: EmailDeliveryStatus;
	message: string | null;
	external_message_id: string | null;
	strategy_identifier: string;
	strategy_data: JSONColumnType<
		Record<string, unknown>,
		Record<string, unknown> | null,
		Record<string, unknown> | null
	>;
	simulate: BooleanInt;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
}
