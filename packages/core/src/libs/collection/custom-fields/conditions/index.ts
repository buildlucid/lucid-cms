/**
 * Field condition config and evaluator.
 *
 * This module must stay dependency free. The admin SPA bundles it directly
 * via the `@field-conditions` alias so the admin and the backend share the
 * same deterministic evaluation logic.
 */

export const fieldConditionOperators = [
	"equals",
	"notEquals",
	"isEmpty",
	"isNotEmpty",
	"contains",
	"notContains",
] as const;

export type FieldConditionOperator = (typeof fieldConditionOperators)[number];

export const fieldConditionTranslationScopes = [
	"same",
	"default",
	"any",
] as const;

export type FieldConditionTranslationScope =
	(typeof fieldConditionTranslationScopes)[number];

export type FieldConditionRuleValue = string | number | boolean | null;

export type FieldConditionRule = {
	field: string;
} & (
	| {
			operator: "equals" | "notEquals" | "contains" | "notContains";
			value: FieldConditionRuleValue;
	  }
	| {
			operator: "isEmpty" | "isNotEmpty";
			value?: never;
	  }
);

export type FieldConditionExpression = FieldConditionRule | FieldConditionGroup;

export type FieldConditionGroup =
	| { all: FieldConditionExpression[]; any?: never }
	| { any: FieldConditionExpression[]; all?: never };

export type FieldConditionAction = "show" | "hide";

export type FieldConditionConfig = FieldConditionGroup & {
	action?: FieldConditionAction;
	translationScope?: FieldConditionTranslationScope;
};

export type FieldConditionTargetResolution =
	| {
			resolved: true;
			value: unknown;
	  }
	| {
			resolved: true;
			match: "any";
			values: unknown[];
	  }
	| {
			resolved: false;
	  };

export type FieldConditionTargetResolver = (
	fieldKey: string,
) => FieldConditionTargetResolution;

/**
 * Compares two condition values. Booleans compare loosely against their
 * integer form as some adapters store checkbox values as 0/1.
 */
const conditionValuesEqual = (a: unknown, b: unknown): boolean => {
	if (a === null || a === undefined) return b === null || b === undefined;
	if (b === null || b === undefined) return false;

	if (typeof a === "boolean" || typeof b === "boolean") {
		const left = toBooleanComparable(a);
		const right = toBooleanComparable(b);
		if (left === undefined || right === undefined) return false;
		return left === right;
	}

	return a === b;
};

const toBooleanComparable = (value: unknown): boolean | undefined => {
	if (typeof value === "boolean") return value;
	if (value === 1) return true;
	if (value === 0) return false;
	return undefined;
};

const isEmptyValue = (value: unknown): boolean => {
	if (value === undefined || value === null || value === "") return true;
	if (Array.isArray(value) && value.length === 0) return true;
	return false;
};

const containsValue = (
	value: unknown,
	search: FieldConditionRuleValue,
): boolean => {
	if (Array.isArray(value)) {
		return value.some((item) => conditionValuesEqual(item, search));
	}
	if (typeof value === "string") {
		if (typeof search === "string") {
			return search.length > 0 && value.includes(search);
		}
		if (typeof search === "number" || typeof search === "boolean") {
			return value.includes(String(search));
		}
		return false;
	}
	return false;
};

/**
 * Evaluates a single condition rule against a resolved target value.
 */
export const evaluateConditionRule = (
	rule: FieldConditionRule,
	value: unknown,
): boolean => {
	switch (rule.operator) {
		case "equals":
			return conditionValuesEqual(value, rule.value);
		case "notEquals":
			return !conditionValuesEqual(value, rule.value);
		case "isEmpty":
			return isEmptyValue(value);
		case "isNotEmpty":
			return !isEmptyValue(value);
		case "contains":
			return containsValue(value, rule.value);
		case "notContains":
			return !containsValue(value, rule.value);
		default: {
			const exhaustive: never = rule;
			return exhaustive;
		}
	}
};

/**
 * Evaluates `all` and `any` groups using the same rules in the admin and server.
 * An empty `all` group matches; an empty `any` group does not.
 * A rule whose target cannot be resolved does not match.
 */
export const evaluateFieldCondition = (
	condition: FieldConditionConfig | undefined,
	resolveTarget: FieldConditionTargetResolver,
): boolean => {
	if (!condition) return true;

	const evaluate = (expression: FieldConditionExpression): boolean => {
		if ("field" in expression) {
			const target = resolveTarget(expression.field);
			if (!target.resolved) return false;
			if ("values" in target) {
				return target.values.some((value) =>
					evaluateConditionRule(expression, value),
				);
			}
			return evaluateConditionRule(expression, target.value);
		}
		return expression.all
			? expression.all.every(evaluate)
			: expression.any.some(evaluate);
	};

	const matched = evaluate(condition);
	return (condition.action ?? "show") === "show" ? matched : !matched;
};
