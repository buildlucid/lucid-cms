import LucidError from "../../../utils/errors/lucid-error.js";
import type FieldBuilder from "../../collection/builders/field-builder/index.js";
import type CustomField from "../../collection/custom-fields/custom-field.js";
import type {
	FieldConditionConfig,
	FieldTypes,
	FieldUIConfig,
} from "../../collection/custom-fields/types.js";
import { translate } from "../../i18n/index.js";

const getFieldCondition = (
	field: CustomField<FieldTypes>,
): FieldConditionConfig | undefined => {
	return (field.config as { ui?: FieldUIConfig }).ui?.condition;
};

/**
 * Returns the scope keys a field can resolve condition targets against:
 * its own tree scope followed by each ancestor repeater scope up to the root.
 */
const ancestorScopeKeys = (
	fields: Map<string, CustomField<FieldTypes>>,
	field: CustomField<FieldTypes>,
): Array<string | null> => {
	const scopes: Array<string | null> = [];
	let parent = field.treeParent;

	while (parent !== null) {
		scopes.push(parent);
		parent = fields.get(parent)?.treeParent ?? null;
	}

	scopes.push(null);
	return scopes;
};

/**
 * Validates that field conditions only reference resolvable targets: a field
 * in the same tree that is a direct sibling or lives in an ancestor scope.
 */
const checkFieldConditions = (
	type: "brick" | "collection",
	typeKey: string,
	builder: FieldBuilder,
) => {
	for (const [key, field] of builder.fields) {
		const condition = getFieldCondition(field);
		if (!condition) continue;

		for (const rules of condition.groups ?? []) {
			for (const rule of rules) {
				const errorData = {
					field: key,
					target: rule.field,
					type: type,
					typeKey: typeKey,
				};

				if (rule.field === key) {
					throw new LucidError({
						message: translate("server:core.fields.condition.target.self", {
							data: errorData,
						}),
					});
				}

				const target = builder.fields.get(rule.field);
				if (!target) {
					throw new LucidError({
						message: translate(
							"server:core.fields.condition.target.not.found",
							{
								data: errorData,
							},
						),
					});
				}

				if (target.type === "repeater" || target.type === "tab") {
					throw new LucidError({
						message: translate(
							"server:core.fields.condition.target.invalid.type",
							{
								data: {
									...errorData,
									targetType: target.type,
								},
							},
						),
					});
				}

				const scopes = ancestorScopeKeys(builder.fields, field);
				if (!scopes.includes(target.treeParent)) {
					throw new LucidError({
						message: translate(
							"server:core.fields.condition.target.out.of.scope",
							{
								data: errorData,
							},
						),
					});
				}
			}
		}
	}
};

export default checkFieldConditions;
