import T from "../../../translations/index.js";
import { sql } from "kysely";
import { LucidError } from "../../../utils/errors/index.js";

// https://old.kyse.link/?p=s&i=C0yoagEodj9vv4AxE3TH
const values = <R extends Record<string, unknown>, A extends string>(
	records: R[],
	alias: A,
) => {
	// Assume there's at least one record and all records
	// have the same keys.
	const firstRecord = records[0];
	if (!firstRecord) {
		throw new LucidError({
			message: T("no_records_provided"),
		});
	}
	const keys = Object.keys(firstRecord);

	// Transform the records into a list of lists such as
	// ($1, $2, $3), ($4, $5, $6)
	const values = sql.join(
		records.map((r) => sql`(${sql.join(keys.map((k) => r[k]))})`),
	);

	// Create the alias `v(id, v1, v2)` that specifies the table alias
	// AND a name for each column.
	const wrappedAlias = sql.ref(alias);
	const wrappedColumns = sql.join(keys.map(sql.ref));
	const aliasSql = sql`${wrappedAlias}(${wrappedColumns})`;

	// Finally create a single `AliasedRawBuilder` instance of the
	// whole thing. Note that we need to explicitly specify
	// the alias type using `.as<A>` because we are using a
	// raw sql snippet as the alias.
	return sql<R>`(values ${values})`.as<A>(aliasSql);
};

export default values;
