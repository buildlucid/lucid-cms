import type { ServiceContext } from "../../../utils/services/types.js";
import { resolveEffectiveConnection } from "../storage.js";
import markConnectionRevoked from "./mark-revoked.js";

/**
 * Marks the effective grant revoked after a protected Lucid endpoint rejects
 * its bearer token. Callers deliberately do not replay generation requests.
 */
const handleProtectedResourceUnauthorized = async (context: ServiceContext) => {
	const row = await resolveEffectiveConnection(context);
	if (row.error || !row.data) return row;

	return markConnectionRevoked(context, row.data.id);
};

export default handleProtectedResourceUnauthorized;
