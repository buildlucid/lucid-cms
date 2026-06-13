import { type SelectQueryBuilder, sql } from "kysely";

const applyTenantScope = <DB, TB extends keyof DB, O>(
	query: SelectQueryBuilder<DB, TB, O>,
	props: {
		tenantKey: string | null | undefined;
		column: string;
	},
) => {
	if (props.tenantKey == null) return query;
	return query.where(
		sql<boolean>`(${sql.ref(props.column)} = ${props.tenantKey} or ${sql.ref(props.column)} is null)`,
	);
};

export const applyDocumentVersionTenantScope = <DB, TB extends keyof DB, O>(
	query: SelectQueryBuilder<DB, TB, O>,
	props: {
		tenantKey: string | null | undefined;
		documentTable: string;
		versionTable: string;
	},
) => {
	if (props.tenantKey == null) return query;
	return query.where(
		sql<boolean>`exists (
			select 1
			from ${sql.table(props.documentTable)} as tenant_document
			where tenant_document.id = ${sql.ref(`${props.versionTable}.document_id`)}
			and (
				tenant_document.tenant_key = ${props.tenantKey}
				or tenant_document.tenant_key is null
			)
		)`,
	);
};

export default applyTenantScope;
