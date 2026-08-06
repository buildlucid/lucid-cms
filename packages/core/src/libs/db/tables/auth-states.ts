import type { Generated } from "kysely";
import z from "zod";
import constants from "../../../constants/constants.js";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const authStatesTable = defineTable("lucid_auth_states", () => ({
	columns: {
		id: {
			schema: z.number(),
			type: "primary",
		},
		state: {
			schema: z.string(),
			type: "text",
		},
		provider_key: {
			schema: z.string(),
			type: "text",
		},
		code_verifier: {
			schema: z.string(),
			type: "text",
		},
		nonce: {
			schema: z.string().nullable(),
			type: "text",
		},
		authenticated_user_id: {
			schema: z.number().nullable(),
			type: "integer",
		},
		action_type: {
			schema: z.enum([
				constants.authState.actionTypes.invitation,
				constants.authState.actionTypes.authLink,
				constants.authState.actionTypes.login,
			]),
			type: "text",
		},
		invitation_token_id: {
			schema: z.number().nullable(),
			type: "integer",
		},
		invitation_token: {
			schema: z.string().nullable(),
			type: "text",
		},
		redirect_path: {
			schema: z.string().nullable(),
			type: "text",
		},
		expiry_date: {
			schema: z.union([z.string(), z.date()]),
			type: "timestamp",
		},
		consumed_at: {
			schema: z.union([z.string(), z.date()]).nullable(),
			type: "timestamp",
		},
		created_at: {
			schema: z.union([z.string(), z.date()]),
			type: "timestamp",
		},
	},
}));

export type AuthStateActionType =
	(typeof constants.authState.actionTypes)[keyof typeof constants.authState.actionTypes];

export interface LucidAuthStates {
	id: Generated<number>;
	state: string;
	provider_key: string;
	code_verifier: string;
	nonce: string | null;
	authenticated_user_id: number | null;
	action_type: AuthStateActionType;
	expiry_date: TimestampImmutable;
	consumed_at: TimestampMutable;
	redirect_path: string | null;
	invitation_token_id: number | null;
	invitation_token: string | null;
	created_at: TimestampImmutable;
}
