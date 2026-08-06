import type { Generated } from "kysely";
import z from "zod";
import constants from "../../../constants/constants.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const emailChangeRequestsTable = defineTable(
	"lucid_email_change_requests",
	() => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			user_id: {
				schema: z.number(),
				type: "integer",
			},
			old_email: {
				schema: z.email(),
				type: "text",
			},
			new_email: {
				schema: z.email(),
				type: "text",
			},
			confirm_token_id: {
				schema: z.number(),
				type: "integer",
			},
			revert_token_id: {
				schema: z.number(),
				type: "integer",
			},
			status: {
				schema: z.union([
					z.literal(constants.emailChangeRequestStatuses.pending),
					z.literal(constants.emailChangeRequestStatuses.confirmed),
					z.literal(constants.emailChangeRequestStatuses.cancelled),
					z.literal(constants.emailChangeRequestStatuses.reverted),
					z.literal(constants.emailChangeRequestStatuses.superseded),
				]),
				type: "varchar",
				args: [255],
			},
			confirmed_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			cancelled_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			reverted_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			created_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			updated_at: {
				schema: z.union([z.string(), z.date()]).nullable(),
				type: "timestamp",
			},
			expires_at: {
				schema: z.union([z.string(), z.date()]),
				type: "timestamp",
			},
		},
		query: {
			filters: {
				userId: "user_id",
				oldEmail: "old_email",
				newEmail: "new_email",
				status: "status",
			},
			sorts: {
				createdAt: "created_at",
				updatedAt: "updated_at",
				expiresAt: "expires_at",
			},
			operators: {
				oldEmail: "contains",
				newEmail: "contains",
			},
		} as const,
	}),
);

export type EmailChangeRequestStatus =
	(typeof constants.emailChangeRequestStatuses)[keyof typeof constants.emailChangeRequestStatuses];

export interface LucidEmailChangeRequests {
	id: Generated<number>;
	user_id: number;
	old_email: string;
	new_email: string;
	confirm_token_id: number;
	revert_token_id: number;
	status: EmailChangeRequestStatus;
	confirmed_at: TimestampMutable;
	cancelled_at: TimestampMutable;
	reverted_at: TimestampMutable;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
	expires_at: TimestampMutable;
}
