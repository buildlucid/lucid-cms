type TenantScopedPayload = {
	payload: Record<string, unknown>;
	/** Tenant scope for this payload. Empty or null means the queued job is global. */
	tenantKeys?: Array<string | null | undefined>;
};

const normalizeTenantKeys = (
	tenantKeys: Array<string | null | undefined> | undefined,
) =>
	Array.from(
		new Set(
			(tenantKeys ?? []).filter(
				(tenantKey): tenantKey is string =>
					tenantKey !== null && tenantKey !== undefined,
			),
		),
	).sort();

/**
 * Splits mixed tenant payloads into batches with one shared tenant scope.
 * Queue batch options apply to every payload, so mixed scopes need separate batches.
 */
const groupQueuePayloadsByTenant = (items: TenantScopedPayload[]) => {
	const groups = new Map<
		string,
		{
			tenantKeys: string[];
			payloads: Record<string, unknown>[];
		}
	>();

	for (const item of items) {
		const tenantKeys = normalizeTenantKeys(item.tenantKeys);
		const groupKey = JSON.stringify(tenantKeys);
		const existing = groups.get(groupKey);

		if (existing) {
			existing.payloads.push(item.payload);
			continue;
		}

		groups.set(groupKey, {
			tenantKeys,
			payloads: [item.payload],
		});
	}

	return Array.from(groups.values());
};

export default groupQueuePayloadsByTenant;
