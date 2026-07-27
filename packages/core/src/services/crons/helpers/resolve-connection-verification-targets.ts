import type { LucidRemoteConnectionRow } from "../../../libs/repositories/index.js";
import { multiTenancyEnabled } from "../../../utils/helpers/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";

/**
 * Resolves every effective tenant connection while deduplicating a shared
 * global fallback and excluding rows without an active local grant.
 */
const resolveConnectionVerificationTargets = (
	context: ServiceContext,
	rows: LucidRemoteConnectionRow[],
) => {
	if (!multiTenancyEnabled(context.config)) {
		return rows[0]?.grant_encrypted ? [rows[0]] : [];
	}

	const global = rows.find((row) => row.tenant_key === null);
	const targets = new Map<number, LucidRemoteConnectionRow>();
	if (global) targets.set(global.id, global);

	const byTenant = new Map<string, LucidRemoteConnectionRow>();
	for (const row of rows) {
		if (row.tenant_key !== null && !byTenant.has(row.tenant_key)) {
			byTenant.set(row.tenant_key, row);
		}
	}
	for (const tenant of context.config.tenants) {
		const row = byTenant.get(tenant.key) ?? global;
		if (row) targets.set(row.id, row);
	}

	return [...targets.values()].filter(
		(connection) => connection.grant_encrypted !== null,
	);
};

export default resolveConnectionVerificationTargets;
