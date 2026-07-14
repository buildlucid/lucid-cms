import {
	numberFilter,
	type OrFilterCondition,
	type QueryStateSchema,
	textFilter,
} from "@/hooks/useQueryState";

interface MediaDimensionFilterBounds {
	min?: number;
	max?: number;
}

interface MediaSelectorFilterConstraints {
	extensions?: string;
	type?: string;
	width?: MediaDimensionFilterBounds;
	height?: MediaDimensionFilterBounds;
}

type MediaSelectorFilterKey = "extension" | "type" | "width" | "height";

const buildConditions = (
	constraints: MediaSelectorFilterConstraints,
): OrFilterCondition[] => {
	const conditions: OrFilterCondition[] = [];

	if (constraints.type) {
		conditions.push({ key: "type", value: constraints.type });
	}
	if (constraints.extensions) {
		conditions.push({ key: "extension", value: constraints.extensions });
	}
	if (typeof constraints.width?.min === "number") {
		conditions.push({
			key: "width",
			value: constraints.width.min,
			operator: ">=",
		});
	}
	if (typeof constraints.width?.max === "number") {
		conditions.push({
			key: "width",
			value: constraints.width.max,
			operator: "<=",
		});
	}
	if (typeof constraints.height?.min === "number") {
		conditions.push({
			key: "height",
			value: constraints.height.min,
			operator: ">=",
		});
	}
	if (typeof constraints.height?.max === "number") {
		conditions.push({
			key: "height",
			value: constraints.height.max,
			operator: "<=",
		});
	}

	return conditions;
};

/**
 * Builds selector defaults from media-field validation. Repeated width or
 * height conditions use one grouped branch so both bounds reach the API.
 */
const buildMediaSelectorFilterSchema = (
	constraints: MediaSelectorFilterConstraints,
): Pick<QueryStateSchema, "filters" | "defaultOrFilterGroups"> => {
	const conditions = buildConditions(constraints);
	const keys = conditions.map((condition) => condition.key);
	const requiresGroupedDefaults = new Set(keys).size !== keys.length;
	const conditionFor = (key: MediaSelectorFilterKey) =>
		requiresGroupedDefaults
			? undefined
			: conditions.find((condition) => condition.key === key);
	const type = conditionFor("type");
	const extension = conditionFor("extension");
	const width = conditionFor("width");
	const height = conditionFor("height");

	return {
		filters: {
			type: type
				? textFilter({ defaultValue: String(type.value) })
				: textFilter(),
			extension: extension
				? textFilter({ defaultValue: String(extension.value) })
				: textFilter(),
			width:
				typeof width?.value === "number"
					? numberFilter({
							defaultValue: width.value,
							defaultOperator: width.operator,
						})
					: numberFilter(),
			height:
				typeof height?.value === "number"
					? numberFilter({
							defaultValue: height.value,
							defaultOperator: height.operator,
						})
					: numberFilter(),
		},
		defaultOrFilterGroups: requiresGroupedDefaults ? [conditions] : undefined,
	};
};

export default buildMediaSelectorFilterSchema;
