import { isFieldTypeFilterable } from "@field-capabilities";
import type { Collection } from "@types";
import {
	booleanFilter,
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
	/** `field label` or `brick label > field label` */
	label: string;
	type: DocumentFilterFieldType;
	/** select field options */
	options?: Array<{ value: string; label: string }>;
	/** datetime fields - whether the field includes time selection */
	time?: boolean;
	/** checkbox fields - custom true/false labels */
	trueLabel?: string;
	falseLabel?: string;
}

export type DocumentFilterOperator =
	| "="
	| "!="
	| "like"
	| "not like"
	| ">"
	| ">="
	| "<"
	| "<=";

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
	return filterField;
};

interface CollectContext {
	/** undefined for collection-level fields */
	brickKey?: string;
	/** nearest repeater ancestor - determines the tree-table path segment */
	repeaterKey?: string;
	labelPrefix?: string;
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
 * Collects supported filterable leaf fields. Structural containers
 * (tab/section/collapsible) and repeaters are traversed but do not contribute
 * to labels - display names stay `brick label > field label`.
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
				context,
				result,
			);
			continue;
		}
		if (field.type === "repeater") {
			collectFilterFields(
				field.fields,
				{ ...context, repeaterKey: field.key },
				result,
			);
			continue;
		}

		const label = context.labelPrefix
			? `${context.labelPrefix} > ${fieldLabel(field)}`
			: fieldLabel(field);
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
			{ brickKey: brick.key, labelPrefix: brickLabel(brick) },
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

const OPERATORS_BY_FIELD_TYPE: Record<
	DocumentFilterFieldType,
	DocumentFilterOperator[]
> = {
	text: ["=", "!=", "like", "not like"],
	textarea: ["=", "!=", "like", "not like"],
	color: ["=", "!=", "like", "not like"],
	number: ["=", "!=", ">", ">=", "<", "<="],
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
	like: "filter.operators.like",
	"not like": "filter.operators.not.like",
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

/** Filter codec used for a field type's committed query-state values. */
export const codecForFilterFieldType = (type: DocumentFilterFieldType) => {
	switch (type) {
		case "checkbox":
			return booleanFilter();
		case "number":
		case "user":
		case "relation":
		case "media":
			return numberFilter();
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
