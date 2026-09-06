import z from "zod";
import {
	type FieldConditionConfig,
	type FieldConditionExpression,
	fieldConditionTranslationScopes,
} from "./index.js";

const fieldConditionRuleSchema = z.discriminatedUnion("operator", [
	z.strictObject({
		field: z.string().trim().min(1),
		operator: z.enum(["equals", "notEquals", "contains", "notContains"]),
		value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
	}),
	z.strictObject({
		field: z.string().trim().min(1),
		operator: z.enum(["isEmpty", "isNotEmpty"]),
	}),
]);

const fieldConditionExpressionSchema: z.ZodType<FieldConditionExpression> =
	z.lazy(() =>
		z.union([
			fieldConditionRuleSchema,
			z.strictObject({ all: z.array(fieldConditionExpressionSchema) }),
			z.strictObject({ any: z.array(fieldConditionExpressionSchema) }),
		]),
	);

const conditionOptions = {
	action: z.enum(["show", "hide"]).optional(),
	translationScope: z.enum(fieldConditionTranslationScopes).optional(),
};

export const fieldConditionSchema: z.ZodType<FieldConditionConfig> = z.union([
	z.strictObject({
		...conditionOptions,
		all: z.array(fieldConditionExpressionSchema),
	}),
	z.strictObject({
		...conditionOptions,
		any: z.array(fieldConditionExpressionSchema),
	}),
]);
