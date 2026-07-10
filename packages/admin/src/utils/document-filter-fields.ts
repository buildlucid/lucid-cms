import { isFieldTypeFilterable } from "@field-capabilities";
import type { Collection } from "@types";
import {
	booleanFilter,
	type FilterValue,
	numberFilter,
	type QueryFilterSchema,
	textFilter,
} from "@/hooks/useQueryState";
import T from "@/translations";
import type {
	CollectionBrickConfig,
	CollectionFieldConfig,
} from "@/types/collection-config";
import helpers from "@/utils/helpers";

/** Filterable field types with value editors in the document filter section. */
export const FILTERABLE_FIELD_TYPES = [
	"text",
	"textarea",
	"number",
	"range",
	"datetime",
	"checkbox",
	"select",
	"color",
	"user",
	"relation",
	"media",
] as const;

export type DocumentFilterFieldType = (typeof FILTERABLE_FIELD_TYPES)[number];

export interface DocumentFilterField {
	/** Backend filter path - `_fieldKey`, `brickKey._fieldKey` or `brickKey.repeaterKey._fieldKey` */
	key: string;
	/** `[brick label > ][ancestor container labels > ]field label` */
	label: string;
	type: DocumentFilterFieldType;
	/** select field options */
	options?: Array<{ value: string; label: string }>;
	/** datetime fields - whether the field includes time selection */
	time?: boolean;
	/** checkbox fields - custom true/false labels */
	trueLabel?: string;
	falseLabel?: string;
	/** relation fields - collection keys the document picker can select from */
	collections?: string[];
	/** relation fields normally commit `collectionKey:id`; resource filters that
	 * target a plain document ID can opt into an ID-only value. */
	relationValue?: "collection-id" | "id";
	/** media fields - picker constraints from the field's validation */
	mediaType?: string;
	mediaExtensions?: string;
	/** Optional operator subset/order for filters with backend-specific rules. */
	operators?: DocumentFilterOperator[];
}

export type DocumentFilterOperator =
	| "="
	| "!="
	| ">"
	| ">="
	| "<"
	| "<="
	| "contains"
	| "not-contains"
	| "starts-with"
	| "not-starts-with"
	| "ends-with"
	| "not-ends-with";

const STRUCTURAL_FIELD_TYPES = new Set(["tab", "section", "collapsible"]);

/** Requires both core filterability and a value editor in this section. */
const isSupportedFieldType = (
	type: string,
): type is DocumentFilterFieldType => {
	return (
		isFieldTypeFilterable(type) &&
		(FILTERABLE_FIELD_TYPES as readonly string[]).includes(type)
	);
};

const fieldLabel = (field: CollectionFieldConfig): string => {
	return (
		helpers.getLocaleValue({
			value: field.details.label,
			fallback: field.key,
		}) || field.key
	);
};

const toFilterField = (
	field: CollectionFieldConfig,
	key: string,
	label: string,
): DocumentFilterField | undefined => {
	if (!isSupportedFieldType(field.type)) return undefined;

	const filterField: DocumentFilterField = {
		key,
		label,
		type: field.type,
	};
	if (field.type === "select") {
		filterField.options = (field.options ?? []).map((option, i) => ({
			value: option.value,
			label:
				helpers.getLocaleValue({
					value: option.label,
					fallback: T()("fields.options.label", { count: i }),
				}) || String(option.value),
		}));
	}
	if (field.type === "datetime") {
		filterField.time = field.time !== false;
	}
	if (field.type === "checkbox") {
		const trueLabel = helpers.getLocaleValue({ value: field.details.true });
		const falseLabel = helpers.getLocaleValue({ value: field.details.false });
		if (trueLabel) filterField.trueLabel = trueLabel;
		if (falseLabel) filterField.falseLabel = falseLabel;
	}
	if (field.type === "relation") {
		filterField.collections = Array.isArray(field.collection)
			? field.collection
			: [field.collection];
	}
	if (field.type === "media") {
		if (field.validation?.type) filterField.mediaType = field.validation.type;
		if (field.validation?.extensions?.length) {
			filterField.mediaExtensions = field.validation.extensions
				.map((extension) => extension.replace(".", ""))
				.join(",");
		}
	}
	return filterField;
};

interface CollectContext {
	/** undefined for collection-level fields */
	brickKey?: string;
	/** nearest repeater ancestor - determines the tree-table path segment */
	repeaterKey?: string;
	/** brick display name - always leads the label when present */
	brickLabel?: string;
	/** ordered container (tab/section/collapsible/repeater) display names */
	containerLabels?: string[];
}

/**
 * Builds the backend filter path for a leaf field:
 * - collection field: `_fieldKey`
 * - brick field: `brickKey._fieldKey`
 * - repeater child: `fields.repeaterKey._fieldKey` / `brickKey.repeaterKey._fieldKey`
 */
const buildFilterKey = (context: CollectContext, fieldKey: string): string => {
	if (context.repeaterKey !== undefined) {
		return `${context.brickKey ?? "fields"}.${context.repeaterKey}._${fieldKey}`;
	}
	if (context.brickKey !== undefined) {
		return `${context.brickKey}._${fieldKey}`;
	}
	return `_${fieldKey}`;
};

/**
 * Collects supported filterable leaf fields. Field labels are not unique, so
 * the display name carries the brick label plus the field's full container
 * ancestry: `[brick > ][ancestor containers > ]field label`.
 */
const collectFilterFields = (
	fields: CollectionFieldConfig[] | undefined,
	context: CollectContext,
	result: DocumentFilterField[],
) => {
	if (!fields) return;
	for (const field of fields) {
		if (STRUCTURAL_FIELD_TYPES.has(field.type)) {
			collectFilterFields(
				(field as { fields?: CollectionFieldConfig[] }).fields,
				{
					...context,
					containerLabels: [
						...(context.containerLabels ?? []),
						fieldLabel(field),
					],
				},
				result,
			);
			continue;
		}
		if (field.type === "repeater") {
			collectFilterFields(
				field.fields,
				{
					...context,
					repeaterKey: field.key,
					containerLabels: [
						...(context.containerLabels ?? []),
						fieldLabel(field),
					],
				},
				result,
			);
			continue;
		}

		const label = [
			context.brickLabel,
			...(context.containerLabels ?? []),
			fieldLabel(field),
		]
			.filter((part): part is string => part !== undefined)
			.join(" > ");
		const filterField = toFilterField(
			field,
			buildFilterKey(context, field.key),
			label,
		);
		if (filterField) result.push(filterField);
	}
};

const brickLabel = (brick: CollectionBrickConfig): string => {
	return (
		helpers.getLocaleValue({
			value: brick.details.name,
			fallback: brick.key,
		}) || brick.key
	);
};

/**
 * Builds the where options for the document filter section from the
 * collection's own fields and its fixed/builder brick fields. Options are
 * deduped by their backend filter path.
 */
export const documentFilterFields = (
	collection?: Collection,
): DocumentFilterField[] => {
	const result: DocumentFilterField[] = [];

	collectFilterFields(collection?.fields, {}, result);

	const bricks = [
		...(collection?.fixedBricks ?? []),
		...(collection?.builderBricks ?? []),
	];
	for (const brick of bricks) {
		collectFilterFields(
			brick.fields,
			{ brickKey: brick.key, brickLabel: brickLabel(brick) },
			result,
		);
	}

	const seen = new Set<string>();
	return result.filter((field) => {
		if (seen.has(field.key)) return false;
		seen.add(field.key);
		return true;
	});
};

/** Collection fields plus management metadata used by document listings. */
export const documentFilterSectionFields = (
	collection?: Collection,
): DocumentFilterField[] => {
	const result = documentFilterFields(collection);

	if (collection?.workflow) {
		result.push(
			{
				key: "workflowStage",
				label: T()("documents.workflow.stage"),
				type: "select",
				options: collection.workflow.stages.map((stage) => ({
					value: stage.key,
					label:
						helpers.getLocaleValue({
							value: stage.name,
							fallback: stage.key,
						}) || stage.key,
				})),
			},
			{
				key: "workflowAssignee",
				label: T()("documents.workflow.assigned.to"),
				type: "user",
			},
		);
	}

	result.push(
		{
			key: "createdBy",
			label: T()("common.created.by"),
			type: "user",
		},
		{
			key: "updatedBy",
			label: T()("common.updated.by"),
			type: "user",
		},
		{
			key: "createdAt",
			label: T()("common.created.at"),
			type: "datetime",
		},
		{
			key: "updatedAt",
			label: T()("common.updated.at"),
			type: "datetime",
		},
	);

	return result;
};

const OPERATORS_BY_FIELD_TYPE: Record<
	DocumentFilterFieldType,
	DocumentFilterOperator[]
> = {
	text: [
		"=",
		"!=",
		"contains",
		"not-contains",
		"starts-with",
		"not-starts-with",
		"ends-with",
		"not-ends-with",
	],
	textarea: [
		"=",
		"!=",
		"contains",
		"not-contains",
		"starts-with",
		"not-starts-with",
		"ends-with",
		"not-ends-with",
	],
	color: ["=", "!="],
	number: ["=", "!=", ">", ">=", "<", "<="],
	range: ["=", "!=", ">", ">=", "<", "<="],
	datetime: ["=", "!=", ">", ">=", "<", "<="],
	checkbox: ["="],
	select: ["=", "!="],
	user: ["=", "!="],
	relation: ["=", "!="],
	media: ["=", "!="],
};

const OPERATOR_LABEL_KEYS: Record<DocumentFilterOperator, string> = {
	"=": "filter.operators.equals",
	"!=": "filter.operators.not.equals",
	contains: "filter.operators.contains",
	"not-contains": "filter.operators.not.contains",
	"starts-with": "filter.operators.starts.with",
	"not-starts-with": "filter.operators.not.starts.with",
	"ends-with": "filter.operators.ends.with",
	"not-ends-with": "filter.operators.not.ends.with",
	">": "filter.operators.greater.than",
	">=": "filter.operators.greater.than.or.equal",
	"<": "filter.operators.less.than",
	"<=": "filter.operators.less.than.or.equal",
};

/** Backend operator tokens supported by the given field type. */
export const operatorsForFieldType = (
	type: DocumentFilterFieldType,
): DocumentFilterOperator[] => {
	return OPERATORS_BY_FIELD_TYPE[type];
};

export const operatorLabel = (operator: DocumentFilterOperator): string => {
	return T()(OPERATOR_LABEL_KEYS[operator]);
};

/** Field types whose value is an entity ID committed via a selection panel. */
export const ENTITY_PICKER_FIELD_TYPES = ["user", "relation", "media"] as const;

export type EntityPickerFieldType = (typeof ENTITY_PICKER_FIELD_TYPES)[number];

export const isEntityPickerFieldType = (
	type: DocumentFilterFieldType,
): type is EntityPickerFieldType =>
	(ENTITY_PICKER_FIELD_TYPES as readonly string[]).includes(type);

export type FilterTextInputType =
	| "text"
	| "number"
	| "date"
	| "datetime-local"
	| "color";

/**
 * Input type for the plain text-style value editor. Entity picker fields fall
 * back to an ID input when pickers are unavailable (nested panels) - relation
 * values are text since they also accept the `collectionKey:id` form.
 */
export const filterValueInputType = (
	field: DocumentFilterField | undefined,
): FilterTextInputType => {
	switch (field?.type) {
		case "number":
		case "range":
		case "user":
		case "media":
			return "number";
		case "datetime":
			return field.time === false ? "date" : "datetime-local";
		case "color":
			return "color";
		default:
			return "text";
	}
};

//* mirrors the backend's compound relation filter value support - collection
//* keys are restricted to ^[a-z0-9-_]+$ so ":" is unambiguous
const RELATION_FILTER_VALUE_REGEX = /^([a-z0-9-_]+):(\d+)$/;

export interface RelationFilterValueParts {
	collectionKey?: string;
	id: number;
}

/** Builds a refresh-safe `collectionKey:id` relation filter value. */
export const formatRelationFilterValue = (parts: {
	collectionKey: string;
	id: number;
}): string => `${parts.collectionKey}:${parts.id}`;

/** Parses relation filter values - plain IDs or `collectionKey:id`. */
export const parseRelationFilterValue = (
	value: FilterValue,
): RelationFilterValueParts | undefined => {
	if (typeof value === "number") {
		return Number.isInteger(value) ? { id: value } : undefined;
	}
	if (typeof value !== "string" || value.trim() === "") return undefined;

	const compound = value.match(RELATION_FILTER_VALUE_REGEX);
	if (compound?.[1] && compound[2]) {
		return { collectionKey: compound[1], id: Number(compound[2]) };
	}
	const numeric = Number(value);
	return Number.isInteger(numeric) ? { id: numeric } : undefined;
};

/** Filter codec used for a field type's committed query-state values. */
export const codecForFilterFieldType = (type: DocumentFilterFieldType) => {
	switch (type) {
		case "checkbox":
			return booleanFilter();
		case "number":
		case "range":
		case "user":
		case "media":
			return numberFilter();
		//* relation values may be `collectionKey:id` strings
		default:
			return textFilter();
	}
};

/** Builds the useQueryState filter schema for the generated where options. */
export const buildDocumentFilterSchema = (
	fields: DocumentFilterField[],
): QueryFilterSchema => {
	const schema: QueryFilterSchema = {};
	for (const field of fields) {
		schema[field.key] = codecForFilterFieldType(field.type);
	}
	return schema;
};
