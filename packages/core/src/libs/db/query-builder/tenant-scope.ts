import type { ReferenceExpression, SelectQueryBuilder } from "kysely";

/**
 * Scopes a select query to a tenant. Rows with a NULL tenant are treated as global
 * and are included with tenant-scoped reads. Global reads remain unscoped.
 */
const applyTenantScope = <DB, TB extends keyof DB, O>(
	query: SelectQueryBuilder<DB, TB, O>,
	props: {
		tenantKey: string | null | undefined;
		column: ReferenceExpression<DB, TB>;
	},
) => {
	if (props.tenantKey == null) return query;
	return query.where((eb) =>
		eb.or([
			eb(props.column, "=", props.tenantKey),
			eb(props.column, "is", null),
		]),
	);
};

export default applyTenantScope;
