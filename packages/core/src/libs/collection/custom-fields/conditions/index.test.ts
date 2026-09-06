import { describe, expect, test } from "vitest";
import {
	evaluateFieldCondition,
	type FieldConditionConfig,
	type FieldConditionTargetResolver,
} from "./index.js";
import { fieldConditionSchema } from "./schema.js";

const resolveValues =
	(values: Record<string, unknown>): FieldConditionTargetResolver =>
	(key) =>
		Object.hasOwn(values, key)
			? { resolved: true, value: values[key] }
			: { resolved: false };

describe("field condition expressions", () => {
	test("all and any can be nested without changing rule scope", () => {
		const condition: FieldConditionConfig = {
			all: [
				{ field: "enabled", operator: "equals", value: true },
				{
					any: [
						{ field: "layout", operator: "equals", value: "hero" },
						{
							all: [
								{ field: "layout", operator: "equals", value: "card" },
								{ field: "title", operator: "isNotEmpty" },
							],
						},
					],
				},
			],
		};

		expect(fieldConditionSchema.parse(condition)).toEqual(condition);
		expect(
			evaluateFieldCondition(
				condition,
				resolveValues({ enabled: 1, layout: "hero" }),
			),
		).toBe(true);
		expect(
			evaluateFieldCondition(
				condition,
				resolveValues({ enabled: true, layout: "card", title: "" }),
			),
		).toBe(false);
		expect(
			evaluateFieldCondition(
				condition,
				resolveValues({ enabled: true, layout: "card", title: "Hello" }),
			),
		).toBe(true);
		expect(
			evaluateFieldCondition(
				condition,
				resolveValues({ enabled: false, layout: "hero" }),
			),
		).toBe(false);
	});

	test("empty groups follow all and any boolean semantics", () => {
		const resolve = resolveValues({});
		expect(evaluateFieldCondition(undefined, resolve)).toBe(true);
		expect(evaluateFieldCondition({ all: [] }, resolve)).toBe(true);
		expect(evaluateFieldCondition({ any: [] }, resolve)).toBe(false);
		expect(evaluateFieldCondition({ action: "hide", all: [] }, resolve)).toBe(
			false,
		);
	});

	test("missing targets fail their rule and hide reverses the complete result", () => {
		const condition: FieldConditionConfig = {
			action: "hide",
			all: [
				{ field: "title", operator: "isEmpty" },
				{ field: "layout", operator: "notEquals", value: "hero" },
			],
		};
		expect(evaluateFieldCondition(condition, resolveValues({}))).toBe(true);
		expect(
			evaluateFieldCondition(
				condition,
				resolveValues({ title: null, layout: "card" }),
			),
		).toBe(false);
	});

	test("a rule can match any resolved translation", () => {
		const condition: FieldConditionConfig = {
			all: [{ field: "title", operator: "contains", value: "Hello" }],
		};
		expect(
			evaluateFieldCondition(condition, () => ({
				resolved: true,
				match: "any",
				values: ["Bonjour", "Hello there"],
			})),
		).toBe(true);
	});

	test.each([
		{ all: [], any: [] },
		{ all: [{ field: "title", operator: "equals" }] },
		{ all: [{ field: "title", operator: "isEmpty", value: "ignored" }] },
		{ all: [{ any: [], action: "hide" }] },
	])("invalid expression shapes fail at the config boundary: %j", (condition) => {
		expect(fieldConditionSchema.safeParse(condition).success).toBe(false);
	});
});
