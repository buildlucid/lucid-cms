import type { Generated, JSONColumnType } from "kysely";
import z from "zod";
import { defineTable } from "../client/table/definition.js";
import type { TimestampImmutable, TimestampMutable } from "../types.js";

export const lucidRemoteConnectionsTable = defineTable(
	"lucid_remote_connections",
	() => ({
		columns: {
			id: {
				schema: z.number(),
				type: "primary",
			},
			status: {
				schema: z.enum(["connected", "disconnected", "revoked"]),
				type: "text",
			},
			registration_encrypted: {
				schema: z.string().nullable(),
				type: "text",
			},
			grant_encrypted: {
				schema: z.string().nullable(),
				type: "text",
			},
			pending_encrypted: {
				schema: z.string().nullable(),
				type: "text",
			},
			pending_state_hash: {
				schema: z.string().nullable(),
				type: "char",
				args: [64],
			},
			pending_expires_at: {
				schema: z.number().nullable(),
				type: "integer",
			},
			display: {
				schema: z.record(z.string(), z.unknown()).nullable(),
				type: "json",
			},
			last_attempt_at: {
				schema: z.number().nullable(),
				type: "integer",
			},
			last_verified_at: {
				schema: z.number().nullable(),
				type: "integer",
			},
			error_key: {
				schema: z.string().nullable(),
				type: "text",
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
	}),
);

export type LucidRemoteConnectionState =
	| "connected"
	| "disconnected"
	| "revoked";

export interface LucidRemoteConnections {
	id: Generated<number>;
	status: LucidRemoteConnectionState;
	registration_encrypted: string | null;
	grant_encrypted: string | null;
	pending_encrypted: string | null;
	pending_state_hash: string | null;
	pending_expires_at: number | null;
	display: JSONColumnType<
		Record<string, unknown> | null,
		Record<string, unknown> | null,
		Record<string, unknown> | null
	>;
	last_attempt_at: number | null;
	last_verified_at: number | null;
	error_key: string | null;
	created_at: TimestampImmutable;
	updated_at: TimestampMutable;
}
