import type { CollectionBuilder } from "@lucidcms/core";
import {
	buildTableName,
	copy,
	prefixGeneratedColName,
} from "@lucidcms/core/plugin";
import type {
	Config,
	FieldInputSchema,
	LucidBrickTableName,
	ServiceResponse,
} from "@lucidcms/core/types";
import type { CollectionConfig, RouteUniqueValues } from "../../types/types.js";

const columnBackedFieldTypes = new Set([
	"text",
	"textarea",
	"select",
	"number",
	"datetime",
]);

const relationBackedFieldTypes = new Set(["relation", "media", "user"]);

const relationFieldTableTypes = {
	relation: "cf_relation",
	media: "cf_media",
	user: "cf_user",
} as const;

const relationFieldValueColumns = {
	relation: [
		prefixGeneratedColName("collection_key"),
		prefixGeneratedColName("document_id"),
	],
	media: [prefixGeneratedColName("media_id")],
	user: [prefixGeneratedColName("user_id")],
} as const;

export type RelationUniqueFieldType = keyof typeof relationFieldTableTypes;

type BaseUniqueField = {
	key: string;
	localized: boolean;
};

export type ColumnUniqueField = BaseUniqueField & {
	storage: "column";
	column: string;
};

export type RelationUniqueField = BaseUniqueField & {
	storage: "relation-table";
	fieldType: RelationUniqueFieldType;
	table: LucidBrickTableName;
	valueColumns: readonly `_${string}`[];
};

export type UniqueField = ColumnUniqueField | RelationUniqueField;

export type UniqueFieldQueryRow = {
	document_id: number;
	document_version_id: number;
	locale: string;
	[key: string]: unknown;
};

export type RelationUniqueFieldQueryRow = {
	document_version_id: number;
	locale: string;
	position: number;
	[key: string]: unknown;
};

export type RelationUniqueValueMap = Map<string, unknown[]>;

/** Builds stable SQL aliases for selected unique field column values. */
export const uniqueFieldAlias = (index: number) => `unique_field_${index}`;

export const isColumnUniqueField = (
	field: UniqueField,
): field is ColumnUniqueField => field.storage === "column";

export const isRelationUniqueField = (
	field: UniqueField,
): field is RelationUniqueField => field.storage === "relation-table";

const isRelationBackedFieldType = (
	type: string,
): type is RelationUniqueFieldType => relationBackedFieldTypes.has(type);

const buildRelationFieldTable = (data: {
	collectionKey: string;
	fieldKey: string;
	fieldType: RelationUniqueFieldType;
	tableNameByteLimit: number | null;
}): Awaited<ServiceResponse<LucidBrickTableName>> => {
	const tableNameRes = buildTableName<LucidBrickTableName>(
		relationFieldTableTypes[data.fieldType],
		{
			collection: data.collectionKey,
			fieldPath: [data.fieldKey],
		},
		data.tableNameByteLimit,
	);
	if (tableNameRes.error) {
		return {
			error: tableNameRes.error,
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: tableNameRes.data.name,
	};
};

/** Resolves and validates the configured top-level fields used with unique.fields. */
export const getUniqueFields = (
	collection: CollectionBuilder,
	collectionConfig: CollectionConfig,
	tableNameByteLimit: number | null,
): Awaited<ServiceResponse<UniqueField[]>> => {
	const uniqueFieldKeys =
		collectionConfig.unique === true || collectionConfig.unique === false
			? []
			: (collectionConfig.unique.fields ?? []);
	const uniqueFields: UniqueField[] = [];

	for (const fieldKey of uniqueFieldKeys) {
		const field = collection.fields.get(fieldKey);
		if (!field) {
			return {
				error: {
					type: "basic",
					status: 500,
					message: copy("server:plugin.pages.unique.field.invalid", {
						data: {
							field: fieldKey,
						},
					}),
				},
				data: undefined,
			};
		}

		const localized =
			collection.getData.localized === true && field.localizedEnabled === true;

		if (columnBackedFieldTypes.has(field.type)) {
			uniqueFields.push({
				key: fieldKey,
				storage: "column",
				column: prefixGeneratedColName(fieldKey),
				localized,
			});
			continue;
		}

		if (isRelationBackedFieldType(field.type)) {
			const relationTableRes = buildRelationFieldTable({
				collectionKey: collectionConfig.collection,
				fieldKey,
				fieldType: field.type,
				tableNameByteLimit,
			});
			if (relationTableRes.error) return relationTableRes;

			uniqueFields.push({
				key: fieldKey,
				storage: "relation-table",
				fieldType: field.type,
				table: relationTableRes.data,
				valueColumns: relationFieldValueColumns[field.type],
				localized,
			});
			continue;
		}

		return {
			error: {
				type: "basic",
				status: 500,
				message: copy("server:plugin.pages.unique.field.invalid", {
					data: {
						field: fieldKey,
					},
				}),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: uniqueFields,
	};
};

const compareRelationTargets = (
	a: { collectionKey: string; id: number },
	b: { collectionKey: string; id: number },
) => {
	const collectionCompare = a.collectionKey.localeCompare(b.collectionKey);
	if (collectionCompare !== 0) return collectionCompare;

	return a.id - b.id;
};

const normalizeRelationIds = (value: unknown): number[] => {
	if (!Array.isArray(value)) return [];

	return value
		.filter((item): item is number => {
			return typeof item === "number" && Number.isFinite(item);
		})
		.sort((a, b) => a - b);
};

const normalizeRelationTargets = (
	value: unknown,
): Array<{ collectionKey: string; id: number }> => {
	if (!Array.isArray(value)) return [];

	return value
		.filter(
			(item): item is { collectionKey: string; id: number } =>
				typeof item === "object" &&
				item !== null &&
				"collectionKey" in item &&
				"id" in item &&
				typeof item.collectionKey === "string" &&
				typeof item.id === "number" &&
				Number.isFinite(item.id),
		)
		.map((item) => ({
			collectionKey: item.collectionKey,
			id: item.id,
		}))
		.sort(compareRelationTargets);
};

export const normalizeUniqueFieldValue = (
	field: UniqueField,
	value: unknown,
) => {
	if (isColumnUniqueField(field)) return value ?? null;
	if (field.fieldType === "relation") return normalizeRelationTargets(value);

	return normalizeRelationIds(value);
};

/** Reads the field value that applies to a specific locale. */
const getUniqueFieldValueForLocale = (data: {
	field: FieldInputSchema | undefined;
	localeCode: string;
	defaultLocale: string;
	localized: boolean;
}) => {
	if (!data.field) return null;

	if (data.localized) {
		if (data.field.translations) {
			return data.field.translations[data.localeCode] ?? null;
		}
		if (data.localeCode === data.defaultLocale) {
			return data.field.value ?? null;
		}
		return null;
	}

	if (data.field.value !== undefined) return data.field.value;
	if (data.field.translations) {
		return data.field.translations[data.defaultLocale] ?? null;
	}
	return null;
};

/** Builds locale-keyed unique values from the fields currently being saved. */
export const getUniqueValuesFromFields = (data: {
	fields: FieldInputSchema[];
	localization: Config["localization"];
	uniqueFields: UniqueField[];
}): RouteUniqueValues => {
	const values: RouteUniqueValues = {};

	for (const locale of data.localization.locales) {
		const localeValues: Record<string, unknown> = {};

		for (const uniqueField of data.uniqueFields) {
			const field = data.fields.find((f) => f.key === uniqueField.key);
			localeValues[uniqueField.key] = normalizeUniqueFieldValue(
				uniqueField,
				getUniqueFieldValueForLocale({
					field,
					localeCode: locale.code,
					defaultLocale: data.localization.defaultLocale,
					localized: uniqueField.localized,
				}),
			);
		}

		values[locale.code] = localeValues;
	}

	return values;
};

export const relationUniqueValueKey = (data: {
	versionId: number;
	localeCode: string;
	fieldKey: string;
}) => `${data.versionId}:${data.localeCode}:${data.fieldKey}`;

const getRelationRowValue = (
	field: RelationUniqueField,
	row: RelationUniqueFieldQueryRow,
) => {
	if (field.fieldType === "relation") {
		const collectionKey = row[prefixGeneratedColName("collection_key")];
		const id = row[prefixGeneratedColName("document_id")];

		if (typeof collectionKey !== "string") return null;
		if (typeof id !== "number" || !Number.isFinite(id)) return null;

		return {
			collectionKey,
			id,
		};
	}

	const idColumn =
		field.fieldType === "media"
			? prefixGeneratedColName("media_id")
			: prefixGeneratedColName("user_id");
	const id = row[idColumn];
	if (typeof id !== "number" || !Number.isFinite(id)) return null;

	return id;
};

export const relationRowsToUniqueValueMap = (data: {
	field: RelationUniqueField;
	rows: RelationUniqueFieldQueryRow[];
}): RelationUniqueValueMap => {
	const groupedRows = new Map<string, unknown[]>();

	for (const row of data.rows) {
		const value = getRelationRowValue(data.field, row);
		if (value === null) continue;

		const key = relationUniqueValueKey({
			versionId: row.document_version_id,
			localeCode: row.locale,
			fieldKey: data.field.key,
		});
		groupedRows.set(key, [...(groupedRows.get(key) ?? []), value]);
	}

	const values = new Map<string, unknown[]>();
	for (const [key, rowValues] of groupedRows) {
		values.set(
			key,
			normalizeUniqueFieldValue(data.field, rowValues) as unknown[],
		);
	}

	return values;
};

export const mergeRelationUniqueValueMaps = (
	maps: RelationUniqueValueMap[],
): RelationUniqueValueMap => {
	const merged = new Map<string, unknown[]>();
	for (const map of maps) {
		for (const [key, value] of map) {
			merged.set(key, value);
		}
	}

	return merged;
};

const getRelationUniqueValue = (data: {
	field: RelationUniqueField;
	relationValues: RelationUniqueValueMap;
	versionId: number;
	localeCode: string;
	defaultLocale: string;
}) => {
	const localeCode = data.field.localized
		? data.localeCode
		: data.defaultLocale;

	return (
		data.relationValues.get(
			relationUniqueValueKey({
				versionId: data.versionId,
				localeCode,
				fieldKey: data.field.key,
			}),
		) ?? []
	);
};

/** Maps selected unique field aliases and relation-table rows to configured field keys. */
export const rowToUniqueValues = (data: {
	row: UniqueFieldQueryRow | undefined;
	uniqueFields: UniqueField[];
	relationValues: RelationUniqueValueMap;
	versionId: number;
	localeCode: string;
	defaultLocale: string;
}) => {
	const values: Record<string, unknown> = {};

	for (const [index, field] of data.uniqueFields.entries()) {
		values[field.key] = isColumnUniqueField(field)
			? normalizeUniqueFieldValue(field, data.row?.[uniqueFieldAlias(index)])
			: getRelationUniqueValue({
					field,
					relationValues: data.relationValues,
					versionId: data.versionId,
					localeCode: data.localeCode,
					defaultLocale: data.defaultLocale,
				});
	}

	return values;
};
