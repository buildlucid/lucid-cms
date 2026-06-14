import type { SelectQueryBuilder } from "kysely";
import type { LucidDB } from "../types.js";
import type { QueryBuilderWhere } from "./index.js";

const selectQueryBuilder = <Table extends keyof LucidDB, O>(
	query: SelectQueryBuilder<LucidDB, Table, O>,
	where: QueryBuilderWhere<Table>,
) => {
	let kyselyQuery = query;

	for (const { key, operator, value, condition } of where) {
		const shouldApply =
			typeof condition === "function" ? condition() : condition;
		if (shouldApply === false) continue;

		kyselyQuery = kyselyQuery.where(key, operator, value);
	}

	return kyselyQuery;
};

export default selectQueryBuilder;
