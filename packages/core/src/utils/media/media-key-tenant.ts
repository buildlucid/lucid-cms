import constants from "../../constants/constants.js";
import type { Config, TenantConfig } from "../../types/config.js";
import { getTenantConfig } from "../helpers/tenants.js";

type MediaVisibility =
	(typeof constants.media.visibilityKeys)[keyof typeof constants.media.visibilityKeys];

type MediaRoot = MediaVisibility | typeof constants.media.awaitingSyncKey;

const isVisibilityKey = (value: string | undefined): value is MediaVisibility =>
	value !== undefined &&
	Object.values(constants.media.visibilityKeys).includes(
		value as MediaVisibility,
	);

const isRootKey = (value: string | undefined): value is MediaRoot =>
	isVisibilityKey(value) || value === constants.media.awaitingSyncKey;

const isReservedTenantSegment = (value: string | undefined) =>
	value !== undefined &&
	(constants.media.reservedTenantKeys as readonly string[]).includes(value);

/**
 * Generated media IDs use UUIDs without dashes.
 * This keeps global keys distinct when the tenant segment is omitted.
 */
export const isGeneratedMediaIdSegment = (value: string | undefined) =>
	value !== undefined && /^[a-f0-9]{32}$/i.test(value);

/**
 * Parses the root, optional tenant, processed marker, and identity segments once.
 * Media helpers use this so the key shape stays consistent across adapters.
 */
export const getMediaKeyParts = (key: string | string[]) => {
	const parts = Array.isArray(key) ? key : key.split("/").filter(Boolean);
	const root = isRootKey(parts[0]) ? parts[0] : null;
	const rootIndex = root ? 0 : -1;
	const visibility = isVisibilityKey(root ?? undefined) ? root : null;
	const visibilityIndex = visibility ? rootIndex : -1;
	const tenantCandidate = parts[rootIndex + 1];
	const hasTenant =
		rootIndex !== -1 &&
		parts[rootIndex + 2] !== undefined &&
		!isReservedTenantSegment(tenantCandidate) &&
		!isGeneratedMediaIdSegment(tenantCandidate);
	const tenantIndex = hasTenant ? rootIndex + 1 : -1;
	const scopedPathStartIndex =
		rootIndex === -1
			? -1
			: tenantIndex === -1
				? rootIndex + 1
				: tenantIndex + 1;
	const processedIndex =
		visibilityIndex !== -1 &&
		parts[scopedPathStartIndex] === constants.media.processedKey
			? scopedPathStartIndex
			: -1;
	const identityIndex =
		rootIndex === -1
			? -1
			: processedIndex === -1
				? scopedPathStartIndex
				: processedIndex + 1;

	return {
		parts,
		root,
		rootIndex,
		visibility,
		visibilityIndex,
		tenantKey: tenantIndex === -1 ? null : (parts[tenantIndex] ?? null),
		tenantIndex,
		scopedPathStartIndex,
		processedIndex,
		identityIndex,
		identity: identityIndex === -1 ? null : (parts[identityIndex] ?? null),
		isProcessed: processedIndex !== -1,
	};
};

/**
 * Finds the public/private segment in the current root-first media key shape.
 */
export const getMediaKeyVisibilityIndex = (parts: string[]) => {
	return getMediaKeyParts(parts).visibilityIndex;
};

/**
 * Finds the storage root in current media keys.
 * Handles canonical media and temporary awaiting-sync upload keys.
 */
export const getMediaKeyRootIndex = (parts: string[]) => {
	return getMediaKeyParts(parts).rootIndex;
};

/**
 * Extracts the tenant key encoded in a media key.
 * Global media omits the tenant segment and resolves to null.
 */
export const getMediaKeyTenantKey = (key: string): string | null => {
	return getMediaKeyParts(key).tenantKey;
};

/**
 * Resolves a configured tenant from a tenant key. Unknown or tenantless keys
 * intentionally resolve to null so adapters can fall back to global storage.
 */
export const resolveMediaTenant = (
	config: Config,
	tenantKey: string | null | undefined,
): TenantConfig | null => {
	if (!tenantKey) return null;
	if (!Array.isArray(config.tenants)) return null;
	return getTenantConfig(config, tenantKey) ?? null;
};

/**
 * Resolves the adapter tenant encoded in a media key.
 * CDN and signed storage routes use this because they do not receive tenant headers.
 */
export const resolveMediaKeyTenant = (
	config: Config,
	key: string,
): TenantConfig | null => resolveMediaTenant(config, getMediaKeyTenantKey(key));
