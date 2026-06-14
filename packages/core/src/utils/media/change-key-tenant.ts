import { getMediaKeyParts } from "./media-key-tenant.js";
import normalizeMediaKey from "./normalize-media-key.js";

/**
 * Adds, removes, or replaces the tenant segment without changing media identity.
 */
const changeKeyTenant = (data: {
	key: string;
	tenantKey: string | null | undefined;
}) => {
	const normalizedKey = normalizeMediaKey(data.key);
	const keyParts = getMediaKeyParts(normalizedKey);
	const parts = [...keyParts.parts];

	if (keyParts.rootIndex === -1) {
		return normalizedKey;
	}

	if (data.tenantKey) {
		if (keyParts.tenantIndex === -1) {
			parts.splice(keyParts.rootIndex + 1, 0, data.tenantKey);
			return parts.join("/");
		}

		parts[keyParts.tenantIndex] = data.tenantKey;
		return parts.join("/");
	}

	if (keyParts.tenantIndex !== -1) {
		parts.splice(keyParts.tenantIndex, 1);
		return parts.join("/");
	}

	return normalizedKey;
};

export default changeKeyTenant;
