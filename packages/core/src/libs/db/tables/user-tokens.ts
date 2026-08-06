import type { Generated } from "kysely";
import z from "zod";
import constants from "../../../constants/constants.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const userTokensTable = defineTable("lucid_user_tokens", (adapter) => ({
	columns: {
		id: {
			schema: z.number(),
			type: "primary",
		},
		user_id: {
			schema: z.number(),
			type: "integer",
		},
		token_type: {
			schema: z.union([
				z.literal(constants.userTokens.passwordReset),
				z.literal(constants.userTokens.refresh),
				z.literal(constants.userTokens.invitation),
				z.literal(constants.userTokens.emailChangeConfirm),
				z.literal(constants.userTokens.emailChangeRevert),
			]),
			type: "varchar",
			args: [255],
		},
		token: {
			schema: z.string(),
			type: "varchar",
			args: [255],
		},
		revoked_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		revoke_reason: {
			schema: z.string().nullable(),
			type: "varchar",
			args: [255],
		},
		consumed_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		replaced_by_token_id: {
			schema: z.number().nullable(),
			type: "integer",
		},
		created_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		expiry_date: {
			schema: z.union([z.string(), z.date()]),
			type: "timestamp",
		},
	},
	results: {
		// user
		user_email: {
			schema: z.email(),
		},
		user_first_name: {
			schema: z.string().nullable(),
		},
		user_last_name: {
			schema: z.string().nullable(),
		},
		user_invitation_accepted: {
			schema: z.union([
				z.literal(adapter.config.defaults.boolean.true),
				z.literal(adapter.config.defaults.boolean.false),
			]),
		},
		user_is_deleted: {
			schema: z.union([
				z.literal(adapter.config.defaults.boolean.true),
				z.literal(adapter.config.defaults.boolean.false),
			]),
		},
		user_is_locked: {
			schema: z.union([
				z.literal(adapter.config.defaults.boolean.true),
				z.literal(adapter.config.defaults.boolean.false),
			]),
		},
	},
}));

export type UserTokenType =
	(typeof constants.userTokens)[keyof typeof constants.userTokens];

export interface LucidUserTokens {
	id: Generated<number>;
	user_id: number;
	token_type: UserTokenType;
	token: string;
	revoked_at: TimestampMutable;
	revoke_reason: string | null;
	consumed_at: TimestampMutable;
	replaced_by_token_id: number | null;
	created_at: TimestampImmutable;
	expiry_date: TimestampMutable;
}
