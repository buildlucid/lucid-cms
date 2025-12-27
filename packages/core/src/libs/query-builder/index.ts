import type {
	ComparisonOperatorExpression,
	OperandValueExpressionOrList,
	ReferenceExpression,
} from "kysely";
import type { LucidDB } from "../db-adapter/types.js";
import deleteQueryBuilder from "./delete-query-builder.js";
import queryBuilder from "./query-builder.js";
import selectQueryBuilder from "./select-query-builder.js";
import updateQueryBuilder from "./update-query-builder.js";

export type QueryBuilderWhere<Table extends keyof LucidDB> = Array<{
	key: ReferenceExpression<LucidDB, Table>;
	operator: ComparisonOperatorExpression;
	value: OperandValueExpressionOrList<LucidDB, Table, keyof Table>;
}>;

export default {
	main: queryBuilder,
	delete: deleteQueryBuilder,
	select: selectQueryBuilder,
	update: updateQueryBuilder,
};
