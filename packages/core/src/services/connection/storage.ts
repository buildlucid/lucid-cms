import type z from "zod";
import type {
	LucidRemoteConnectionState,
	LucidRemoteConnections,
} from "../../libs/db/tables/index.js";
import type { Select, Update } from "../../libs/db/types.js";
import {
	type ConnectionGrant,
	type ConnectionRegistration,
	connectionGrantSchema,
	connectionRegistrationSchema,
} from "../../libs/lucid-remote/schema/connection.js";
import { LucidRemoteConnectionsRepository } from "../../libs/repositories/index.js";
import { decrypt, encrypt } from "../../utils/helpers/encrypt-decrypt.js";
import type { ServiceContext } from "../../utils/services/types.js";
import { hashLucidRemoteConnectionState } from "./helpers/flow-security.js";
import {
	type ConnectionPending,
	connectionPendingSchema,
	type StoredConnectionDisplay,
} from "./types.js";

const readEncrypted = <T>(
	context: ServiceContext,
	ciphertext: string | null,
	schema: z.ZodType<T>,
): T | null => {
	if (!ciphertext) return null;
	const plaintext = decrypt(ciphertext, context.config.secrets.encryption);
	return schema.parse(JSON.parse(plaintext));
};

const writeEncrypted = (context: ServiceContext, value: unknown | null) =>
	value === null
		? null
		: encrypt(JSON.stringify(value), context.config.secrets.encryption);

/** Decrypts and validates a row's confidential OAuth client registration. */
export const getConnectionRegistration = (
	context: ServiceContext,
	row: Select<LucidRemoteConnections>,
) =>
	readEncrypted(
		context,
		row.registration_encrypted,
		connectionRegistrationSchema,
	);

/** Decrypts and validates a row's access and refresh grant. */
export const getConnectionGrant = (
	context: ServiceContext,
	row: Select<LucidRemoteConnections>,
) => readEncrypted(context, row.grant_encrypted, connectionGrantSchema);

/** Decrypts and validates a row's outstanding authorization flow. */
export const getConnectionPending = (
	context: ServiceContext,
	row: Select<LucidRemoteConnections>,
) => readEncrypted(context, row.pending_encrypted, connectionPendingSchema);

/** Resolves the connection row. */
export const resolveEffectiveConnection = (context: ServiceContext) => {
	const Connections = new LucidRemoteConnectionsRepository(context.db);

	return Connections.selectSingle({
		select: [
			"id",
			"status",
			"registration_encrypted",
			"grant_encrypted",
			"pending_encrypted",
			"pending_state_hash",
			"pending_expires_at",
			"display",
			"last_attempt_at",
			"last_verified_at",
			"error_key",
			"created_at",
			"updated_at",
		],
		where: [{ key: "id", operator: "=", value: 1 }],
	});
};

/** Resolves or creates the singleton connection row. */
export const resolveWritableConnection = (context: ServiceContext) => {
	const Connections = new LucidRemoteConnectionsRepository(context.db);
	return Connections.getOrCreate({});
};

/** Finds a pending callback row by state digest. */
export const findConnectionByState = (
	context: ServiceContext,
	state: string,
) => {
	const Connections = new LucidRemoteConnectionsRepository(context.db);

	return Connections.selectSingle({
		select: [
			"id",
			"status",
			"registration_encrypted",
			"grant_encrypted",
			"pending_encrypted",
			"pending_state_hash",
			"pending_expires_at",
			"display",
			"last_attempt_at",
			"last_verified_at",
			"error_key",
			"created_at",
			"updated_at",
		],
		where: [
			{
				key: "pending_state_hash",
				operator: "=",
				value: hashLucidRemoteConnectionState(context, state),
			},
		],
	});
};

/** Atomically clears pending state after all local callback checks pass. */
export const consumeConnectionPending = async (
	context: ServiceContext,
	row: Select<LucidRemoteConnections>,
) => {
	if (!row.pending_state_hash || !row.pending_encrypted) {
		return { error: undefined, data: false };
	}
	const Connections = new LucidRemoteConnectionsRepository(context.db);
	const claimed = await Connections.claimPending({
		id: row.id,
		pendingStateHash: row.pending_state_hash,
		pendingEncrypted: row.pending_encrypted,
	});
	if (claimed.error) return claimed;

	return {
		error: undefined,
		data: claimed.data !== undefined,
	};
};

/**
 * Replaces an unusable client registration and invalidates any grant issued to
 * the previous client, while leaving the new registration available to reconnect.
 */
export const replaceConnectionRegistration = (
	context: ServiceContext,
	rowId: number,
	value: ConnectionRegistration,
) => {
	const Connections = new LucidRemoteConnectionsRepository(context.db);

	return Connections.updateSingle({
		data: {
			registration_encrypted: writeEncrypted(context, value),
			grant_encrypted: null,
			status: "disconnected",
			display: null,
			last_verified_at: null,
			updated_at: new Date().toISOString(),
		},
		where: [{ key: "id", operator: "=", value: rowId }],
		returning: ["id"],
	});
};

/** Stores the encrypted pending flow and its indexed state digest together. */
export const setConnectionPending = (
	context: ServiceContext,
	rowId: number,
	value: {
		pending: ConnectionPending;
		stateHash: string;
	},
) => {
	const Connections = new LucidRemoteConnectionsRepository(context.db);

	return Connections.updateSingle({
		data: {
			pending_encrypted: writeEncrypted(context, value.pending),
			pending_state_hash: value.stateHash,
			pending_expires_at: value.pending.expiresAt,
			updated_at: new Date().toISOString(),
		},
		where: [{ key: "id", operator: "=", value: rowId }],
		returning: ["id"],
	});
};

type PersistedLucidRemoteConnectionState = {
	status?: LucidRemoteConnectionState;
	display?: StoredConnectionDisplay | null;
	lastAttempt?: number | null;
	lastVerified?: number | null;
	errorKey?: string | null;
};

/** Persists non-secret display and verification state in one update. */
export const persistLucidRemoteConnectionState = (
	context: ServiceContext,
	rowId: number,
	state: PersistedLucidRemoteConnectionState,
) => {
	const data: Partial<Update<LucidRemoteConnections>> = {
		updated_at: new Date().toISOString(),
	};
	if (state.status !== undefined) data.status = state.status;
	if (state.display !== undefined) data.display = state.display;
	if (state.lastAttempt !== undefined) data.last_attempt_at = state.lastAttempt;
	if (state.lastVerified !== undefined)
		data.last_verified_at = state.lastVerified;
	if (state.errorKey !== undefined) data.error_key = state.errorKey;

	const Connections = new LucidRemoteConnectionsRepository(context.db);

	return Connections.updateSingle({
		data,
		where: [{ key: "id", operator: "=", value: rowId }],
		returning: ["id"],
	});
};

/** Persists an encrypted grant and related state atomically in one row update. */
export const persistConnectionGrantState = (
	context: ServiceContext,
	rowId: number,
	grant: ConnectionGrant | null,
	state: PersistedLucidRemoteConnectionState = {},
) => {
	const data: Partial<Update<LucidRemoteConnections>> = {
		grant_encrypted: writeEncrypted(context, grant),
		updated_at: new Date().toISOString(),
	};
	if (state.status !== undefined) data.status = state.status;
	if (state.display !== undefined) data.display = state.display;
	if (state.lastAttempt !== undefined) data.last_attempt_at = state.lastAttempt;
	if (state.lastVerified !== undefined)
		data.last_verified_at = state.lastVerified;
	if (state.errorKey !== undefined) data.error_key = state.errorKey;

	const Connections = new LucidRemoteConnectionsRepository(context.db);

	return Connections.updateSingle({
		data,
		where: [{ key: "id", operator: "=", value: rowId }],
		returning: ["id"],
	});
};
