import type z from "zod";
import type { LucidRemoteConnectionState } from "../../libs/db/types.js";
import {
	type ConnectionGrant,
	type ConnectionRegistration,
	connectionGrantSchema,
	connectionRegistrationSchema,
} from "../../libs/lucid-remote/schema/connection.js";
import {
	type LucidRemoteConnectionRow,
	LucidRemoteConnectionsRepository,
} from "../../libs/repositories/index.js";
import { decrypt, encrypt } from "../../utils/helpers/encrypt-decrypt.js";
import { multiTenancyEnabled } from "../../utils/helpers/index.js";
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
	row: LucidRemoteConnectionRow,
) =>
	readEncrypted(
		context,
		row.registration_encrypted,
		connectionRegistrationSchema,
	);

/** Decrypts and validates a row's access and refresh grant. */
export const getConnectionGrant = (
	context: ServiceContext,
	row: LucidRemoteConnectionRow,
) => readEncrypted(context, row.grant_encrypted, connectionGrantSchema);

/** Decrypts and validates a row's outstanding authorization flow. */
export const getConnectionPending = (
	context: ServiceContext,
	row: LucidRemoteConnectionRow,
) => readEncrypted(context, row.pending_encrypted, connectionPendingSchema);

/** Resolves the effective row using the configured tenant/global fallback. */
export const resolveEffectiveConnection = (
	context: ServiceContext,
	tenantKey = context.request.tenantKey ?? null,
) =>
	new LucidRemoteConnectionsRepository(
		context.db.client,
		context.config.db,
	).selectEffective(multiTenancyEnabled(context.config) ? tenantKey : null);

/**
 * Resolves the row that connect may mutate using the normal tenant/global
 * visibility rules, creating a scoped row only when no connection is visible.
 */
export const resolveWritableConnection = async (
	context: ServiceContext,
	tenantKey = context.request.tenantKey ?? null,
) => {
	const connections = new LucidRemoteConnectionsRepository(
		context.db.client,
		context.config.db,
	);
	const scopedTenantKey = multiTenancyEnabled(context.config)
		? tenantKey
		: null;
	const effective = await connections.selectEffective(scopedTenantKey);
	if (effective.error || effective.data) return effective;

	return connections.ensureScope({
		scopeKey: scopedTenantKey ? `tenant:${scopedTenantKey}` : "global",
		tenantKey: scopedTenantKey,
	});
};

/** Finds a pending callback row without using tenant identity. */
export const findConnectionByState = (context: ServiceContext, state: string) =>
	new LucidRemoteConnectionsRepository(
		context.db.client,
		context.config.db,
	).selectByPendingStateHash(hashLucidRemoteConnectionState(context, state));

/** Atomically clears pending state after all local callback checks pass. */
export const consumeConnectionPending = (
	context: ServiceContext,
	row: LucidRemoteConnectionRow,
) => {
	if (!row.pending_state_hash || !row.pending_encrypted) {
		return Promise.resolve({ error: undefined, data: false });
	}
	return new LucidRemoteConnectionsRepository(
		context.db.client,
		context.config.db,
	).claimPending({
		id: row.id,
		pendingStateHash: row.pending_state_hash,
		pendingEncrypted: row.pending_encrypted,
	});
};

/**
 * Replaces an unusable client registration and invalidates any grant issued to
 * the previous client, while leaving the new registration available to reconnect.
 */
export const replaceConnectionRegistration = (
	context: ServiceContext,
	rowId: number,
	value: ConnectionRegistration,
) =>
	new LucidRemoteConnectionsRepository(
		context.db.client,
		context.config.db,
	).updateById(rowId, {
		registration_encrypted: writeEncrypted(context, value),
		grant_encrypted: null,
		status: "disconnected",
		display: null,
		last_verified_at: null,
		updated_at: new Date().toISOString(),
	});

/** Stores the encrypted pending flow and its indexed state digest together. */
export const setConnectionPending = (
	context: ServiceContext,
	rowId: number,
	value: {
		pending: ConnectionPending;
		stateHash: string;
	},
) =>
	new LucidRemoteConnectionsRepository(
		context.db.client,
		context.config.db,
	).updateById(rowId, {
		pending_encrypted: writeEncrypted(context, value.pending),
		pending_state_hash: value.stateHash,
		pending_expires_at: value.pending.expiresAt,
		updated_at: new Date().toISOString(),
	});

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
	const data: Parameters<LucidRemoteConnectionsRepository["updateById"]>[1] = {
		updated_at: new Date().toISOString(),
	};
	if (state.status !== undefined) data.status = state.status;
	if (state.display !== undefined) data.display = state.display;
	if (state.lastAttempt !== undefined) data.last_attempt_at = state.lastAttempt;
	if (state.lastVerified !== undefined)
		data.last_verified_at = state.lastVerified;
	if (state.errorKey !== undefined) data.error_key = state.errorKey;

	return new LucidRemoteConnectionsRepository(
		context.db.client,
		context.config.db,
	).updateById(rowId, data);
};

/** Persists an encrypted grant and related state atomically in one row update. */
export const persistConnectionGrantState = (
	context: ServiceContext,
	rowId: number,
	grant: ConnectionGrant | null,
	state: PersistedLucidRemoteConnectionState = {},
) => {
	const data: Parameters<LucidRemoteConnectionsRepository["updateById"]>[1] = {
		grant_encrypted: writeEncrypted(context, grant),
		updated_at: new Date().toISOString(),
	};
	if (state.status !== undefined) data.status = state.status;
	if (state.display !== undefined) data.display = state.display;
	if (state.lastAttempt !== undefined) data.last_attempt_at = state.lastAttempt;
	if (state.lastVerified !== undefined)
		data.last_verified_at = state.lastVerified;
	if (state.errorKey !== undefined) data.error_key = state.errorKey;

	return new LucidRemoteConnectionsRepository(
		context.db.client,
		context.config.db,
	).updateById(rowId, data);
};
