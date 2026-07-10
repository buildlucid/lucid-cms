import {
	type ComparisonOperatorExpression,
	type ExpressionBuilder,
	type OperandExpression,
	type ReferenceExpression,
	type SqlBool,
	sql,
} from "kysely";
import type {
	FilterObject,
	FilterOperator,
} from "../../../../types/query-params.js";

const TEXT_FILTER_OPERATORS = [
	"contains",
	"not-contains",
	"starts-with",
	"not-starts-with",
	"ends-with",
	"not-ends-with",
] as const satisfies FilterOperator[];

type TextFilterOperator = (typeof TEXT_FILTER_OPERATORS)[number];

/** Narrows operators that need semantic LIKE compilation. */
const isTextFilterOperator = (
	operator: FilterOperator,
): operator is TextFilterOperator =>
	(TEXT_FILTER_OPERATORS as readonly FilterOperator[]).includes(operator);

/** Escapes SQL LIKE metacharacters so filter values remain literal. */
const escapeLikeValue = (value: FilterObject["value"]): string => {
	const stringValue = Array.isArray(value)
		? value.join(",")
		: String(value ?? "");
	return stringValue
		.replaceAll("!", "!!")
		.replaceAll("%", "!%")
		.replaceAll("_", "!_");
};

/** Adds the wildcard placement required by a semantic text operator. */
const textFilterPattern = (
	operator: TextFilterOperator,
	value: FilterObject["value"],
): string => {
	const escapedValue = escapeLikeValue(value);

	if (operator === "contains" || operator === "not-contains") {
		return `%${escapedValue}%`;
	}
	if (operator === "starts-with" || operator === "not-starts-with") {
		return `${escapedValue}%`;
	}
	return `%${escapedValue}`;
};

/** Maps public hyphenated operators to Kysely's SQL operator tokens. */
const comparisonOperator = (
	operator: FilterOperator,
): ComparisonOperatorExpression => {
	if (operator === "not-in") return "not in";
	if (operator === "is-not") return "is not";
	return operator as ComparisonOperatorExpression;
};

/** Compiles public filters with adapter-aware case handling and safe patterns. */
const compileFilterExpression = <DB, Table extends keyof DB>(params: {
	eb: ExpressionBuilder<DB, Table>;
	reference: ReferenceExpression<DB, Table>;
	filter: FilterObject;
	caseInsensitiveLikeOperator: "like" | "ilike";
}): OperandExpression<SqlBool> => {
	const operator =
		params.filter.operator ??
		(Array.isArray(params.filter.value)
			? "in"
			: params.filter.value === null
				? "is"
				: "=");

	if (!isTextFilterOperator(operator)) {
		return params.eb(
			params.reference,
			comparisonOperator(operator),
			params.filter.value,
		);
	}

	const negated = operator.startsWith("not-");
	const databaseOperator = negated
		? params.caseInsensitiveLikeOperator === "ilike"
			? "not ilike"
			: "not like"
		: params.caseInsensitiveLikeOperator;
	const expression = params.eb(
		params.reference,
		databaseOperator,
		textFilterPattern(operator, params.filter.value),
	);

	return sql<SqlBool>`${expression} escape '!'`;
};

export default compileFilterExpression;
