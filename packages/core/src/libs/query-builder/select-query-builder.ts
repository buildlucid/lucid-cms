import type { QueryBuilderWhere } from "./index.js";
import type { SelectQueryBuilder } from "kysely";
import type { LucidDB } from "../db-adapter/types.js";

const selectQueryBuilder = <Table extends keyof LucidDB, O>(
	query: SelectQueryBuilder<LucidDB, Table, O>,
	where: QueryBuilderWhere<Table>,
) => {
	let kyselyQuery = query;

	for (const { key, operator, value } of where) {
		kyselyQuery = kyselyQuery.where(key, operator, value);
	}

	return kyselyQuery;
};

export default selectQueryBuilder;
