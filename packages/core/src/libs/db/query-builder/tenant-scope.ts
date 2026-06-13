import type { ReferenceExpression, SelectQueryBuilder } from "kysely";

/**
 * Scopes a select query to a tenant. Rows with a NULL tenant are treated as global
 * and are always included. When no tenant is resolved this is a no-op, the generic
 * where array is AND-only so the OR condition has to be applied here instead.
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
