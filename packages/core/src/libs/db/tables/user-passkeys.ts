import type { ColumnType, Generated, JSONColumnType } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type {
	BooleanInt,
	TimestampImmutable,
	TimestampMutable,
} from "../types.js";

/** Passkeys users sign in with, one row per credential. */
export const userPasskeysTable = defineTable(
	"lucid_user_passkeys",
	(adapter) => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			user_id: {
				schema: z.number(),
				type: "integer",
			},
			credential_id: {
				schema: z.string(),
				type: "text",
			},
			public_key: {
				schema: z.string(),
				type: "text",
			},
			counter: {
				schema: z.number(),
				type: "real",
			},
			transports: {
				schema: z.array(z.string()).nullable(),
				type: "json",
			},
			backed_up: {
				schema: z.union([
					z.literal(adapter.config.defaults.boolean.true),
					z.literal(adapter.config.defaults.boolean.false),
				]),
				type: "boolean",
			},
			aaguid: {
				schema: z.string().nullable(),
				type: "text",
			},
			name: {
				schema: z.string(),
				type: "text",
			},
			last_used_at: {
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
		},
		results: {
			// user
			user_passkey_user_id: {
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
	}),
);

export interface LucidUserPasskeys {
	id: Generated<number>;
	user_id: number;
	/** The credential's ID, base64url encoded. Browsers send it back with every sign-in. */
	credential_id: string;
	/** The credential's COSE public key, base64url encoded. */
	public_key: string;
	/** The authenticator's signature counter. Synced passkeys usually leave it at 0. */
	counter: Generated<number>;
	/** How the browser can reach the authenticator, such as `internal` or `hybrid`. */
	transports: JSONColumnType<
		string[] | null,
		string[] | null | undefined,
		string[] | null
	>;
	/** Whether the passkey is synced between devices, such as by a password manager. */
	backed_up: ColumnType<BooleanInt, BooleanInt | undefined, BooleanInt>;
	/** Identifies the authenticator's make, used to name the passkey. */
	aaguid: string | null;
	name: string;
	last_used_at: TimestampMutable;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
}
