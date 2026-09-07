import type {
	DocumentField,
	DocumentFieldPlainValue,
	DocumentFieldValueMap,
	FieldConfig,
	FieldTypes,
	FieldValue,
	InternalDocumentField,
	InternalDocumentFieldGroup,
	Refs,
	ResolvedLucidConfig,
} from "../../exports/types.js";
import type BrickBuilder from "../collection/builders/brick-builder/index.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import { getFieldBuilderState } from "../collection/builders/field-builder/index.js";
import fieldConfigs from "../collection/custom-fields/field-configs.js";
import { isStorageMode } from "../collection/custom-fields/storage/index.js";
import prefixGeneratedColName from "../collection/helpers/prefix-generated-column-name.js";
import type { ResolvedCollectionLocalization } from "../collection/helpers/resolve-collection-localization.js";
import type { CollectionSchemaTable } from "../collection/schema/types.js";
import type {
	LucidBricksTable,
	LucidBrickTableName,
} from "../db/tables/index.js";
import type { Select } from "../db/types.js";
import type { BrickQueryResponse } from "../repositories/document-bricks.js";
import type { DocumentQueryResponse } from "../repositories/documents.js";
import DocumentBricksFormatter from "./document-bricks.js";
import formatter from "./helpers.js";

export interface FieldFormatMeta {
	/** Read authoring values without display defaults or hydrated references. */
	editable?: boolean;
	builder: BrickBuilder | CollectionBuilder;
	host: string;
	collection: CollectionBuilder;
	localization: ResolvedCollectionLocalization;
	/** Used to help workout the target brick schema item and the table name. Set to `undefined` if the brick table you're creating fields for is the `document-fields` one */
	brickKey: string | undefined;
	config: ResolvedLucidConfig;
	bricksTableSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
}

interface FieldFormatData {
	/** The filtered target brick table rows, grouped by position, each row represent a different locale for the same brick instance */
	brickRows: Select<LucidBricksTable>[];
	/** The entire bricksQuery or DocumentQueryResponse response data - used to select tree-table rows from later */
	bricksQuery: BrickQueryResponse | DocumentQueryResponse;
	/** The schema for the entire collection and all possible bricks */
	bricksSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
	/** Formatted refs used by custom fields to derive response-only values. */
	refs?: Refs | null;
}

interface IntermediaryFieldValues {
	value: unknown;
	locale: string | null;
}

/**
 * Resolves the localized values for a field from either parent rows or relation rows.
 */
const getFieldValues = (
	data: FieldFormatData,
	meta: FieldFormatMeta & {
		fieldConfig: FieldConfig<FieldTypes>;
	},
): IntermediaryFieldValues[] => {
	const fieldInstance = getFieldBuilderState(meta.builder).fields.get(
		meta.fieldConfig.key,
	);
	if (!fieldInstance) return [];

	const databaseConfig = fieldConfigs[meta.fieldConfig.type].database;
	if (!isStorageMode(databaseConfig, "relation-table")) {
		const fieldKey = prefixGeneratedColName(meta.fieldConfig.key);

		return data.brickRows.map((row) => ({
			value: row[fieldKey],
			locale: row.locale,
		}));
	}

	const relationRows = DocumentBricksFormatter.getRelationRows({
		bricksQuery: data.bricksQuery,
		bricksSchema: data.bricksSchema,
		collectionKey: meta.collection.key,
		brickKey: meta.brickKey,
		fieldKey: meta.fieldConfig.key,
		relationIds: data.brickRows.flatMap((row) => row.id),
		tableType: databaseConfig.tableType,
	});

	return meta.localization.rowLocales.map((locale) => {
		const sourceLocale =
			locale !== null &&
			locale === meta.localization.defaultLocale &&
			!data.brickRows.some((row) => row.locale === locale)
				? null
				: locale;

		const localeValues = relationRows
			.filter((row) => row.locale === sourceLocale)
			.sort((a, b) => a.position - b.position)
			.reduce<unknown[]>((acc, row) => {
				const value = fieldInstance.extractRelationFieldValue(row);
				if (value !== null) acc.push(value);
				return acc;
			}, []);

		return {
			value: localeValues,
			locale,
		};
	});
};

const isTreeTableFieldType = (type: FieldTypes): boolean => {
	return isStorageMode(fieldConfigs[type].database, "tree-table");
};

const getTreeTableChildFieldConfig = (
	field: FieldConfig<FieldTypes>,
): FieldConfig<FieldTypes>[] | null => {
	if (!isTreeTableFieldType(field.type)) return null;
	if (!("fields" in field)) return null;
	if (!Array.isArray(field.fields)) return null;
	return field.fields as FieldConfig<FieldTypes>[];
};

/**
 * The entry point for building out the InternalDocumentField array.
 *
 * Formats stored rows into the nested internal document field shape.
 */
const formatMultiple = (
	data: FieldFormatData,
	meta: FieldFormatMeta,
): InternalDocumentField[] => {
	return buildFieldTree(data, {
		builder: meta.builder,
		fieldConfig: meta.builder.persistedFieldTree,
		host: meta.host,
		localization: meta.localization,
		collection: meta.collection,
		brickKey: meta.brickKey,
		config: meta.config,
		bricksTableSchema: meta.bricksTableSchema,
		editable: meta.editable,
	});
};

/**
 *  Recursively build out the InternalDocumentField based on the nested fieldConfig
 */
const buildFieldTree = (
	data: FieldFormatData,
	meta: FieldFormatMeta & {
		fieldConfig: FieldConfig<FieldTypes>[];
		treeLevel?: number;
		groupRef?: string;
	},
): InternalDocumentField[] => {
	const fieldsRes: InternalDocumentField[] = [];

	//* loop over fieldConfig (nested field structure - no tabs)
	for (const config of meta.fieldConfig) {
		const treeTableChildFields = getTreeTableChildFieldConfig(config);
		if (treeTableChildFields) {
			//* recursively build out tree-table groups
			fieldsRes.push({
				key: config.key,
				type: config.type,
				groupRef: meta.groupRef,
				groups: buildTreeGroups(data, {
					builder: meta.builder,
					treeFieldConfig: config,
					treeChildFields: treeTableChildFields,
					host: meta.host,
					localization: meta.localization,
					collection: meta.collection,
					brickKey: meta.brickKey,
					treeLevel: meta.treeLevel || 0,
					groupRef: meta.groupRef,
					config: meta.config,
					bricksTableSchema: meta.bricksTableSchema,
					editable: meta.editable,
				}),
			});
			continue;
		}

		const fieldValues = getFieldValues(data, {
			builder: meta.builder,
			fieldConfig: config,
			host: meta.host,
			localization: meta.localization,
			collection: meta.collection,
			brickKey: meta.brickKey,
			config: meta.config,
			bricksTableSchema: meta.bricksTableSchema,
			editable: meta.editable,
		});

		const fieldValue = buildField(
			{
				values: fieldValues,
				defaultLocale: meta.localization.defaultLocale,
				refs: data.refs,
			},
			{
				builder: meta.builder,
				fieldConfig: config,
				host: meta.host,
				localization: meta.localization,
				collection: meta.collection,
				brickKey: meta.brickKey,
				config: meta.config,
				groupRef: meta.groupRef,
				bricksTableSchema: meta.bricksTableSchema,
				editable: meta.editable,
			},
		);
		if (fieldValue) fieldsRes.push(fieldValue);
	}

	return fieldsRes;
};

/**
 * Responsible for building a single InternalDocumentField object.
 *
 * Adds in empty locale values, formats the value and constructs either translations or values based on the fields config
 */
const buildField = (
	data: {
		values: IntermediaryFieldValues[];
		defaultLocale: string | null;
		refs?: Refs | null;
	},
	meta: FieldFormatMeta & {
		fieldConfig: FieldConfig<FieldTypes>;
		groupRef?: string;
	},
): InternalDocumentField | null => {
	const cfInstance = getFieldBuilderState(meta.builder).fields.get(
		meta.fieldConfig.key,
	);
	if (!cfInstance) return null;
	const resource =
		"resource" in meta.fieldConfig ? meta.fieldConfig.resource : undefined;

	//* if the field supports translations, use the translations field key
	if (
		!isTreeTableFieldType(meta.fieldConfig.type) &&
		meta.fieldConfig.type !== "tab" &&
		cfInstance.localizedEnabled === true &&
		meta.localization.enabled
	) {
		const fieldTranslations: Record<string, FieldValue> = {};

		//* populate the translations/meta
		for (const locale of meta.localization.locales) {
			const localeValue =
				data.values.find((v) => v.locale === locale) ??
				(locale === data.defaultLocale
					? data.values.find((v) => v.locale === null)
					: undefined);

			if (localeValue) {
				fieldTranslations[locale] = meta.editable
					? cfInstance.formatEditableValue(localeValue.value)
					: cfInstance.formatResponseValue(localeValue.value, {
							locale,
							refs: data.refs ?? null,
						});
			} else {
				fieldTranslations[locale] = null;
			}
		}

		return {
			key: meta.fieldConfig.key,
			type: meta.fieldConfig.type,
			...(resource ? { resource } : {}),
			groupRef: meta.groupRef,
			translations: fieldTranslations,
		};
	}

	//* otherwise use the value key to just store the default locales value
	const defaultValue = data.values.find(
		(f) => f.locale === meta.localization.storageLocale,
	);
	if (!defaultValue) return null;

	return {
		key: meta.fieldConfig.key,
		type: meta.fieldConfig.type,
		...(resource ? { resource } : {}),
		value: meta.editable
			? cfInstance.formatEditableValue(defaultValue.value)
			: cfInstance.formatResponseValue(defaultValue.value, {
					locale: meta.localization.storageLocale,
					refs: data.refs ?? null,
				}),
		groupRef: meta.groupRef,
	};
};

/**
 * Responsible for building out groups for a tree-table field
 */
const buildTreeGroups = (
	data: FieldFormatData,
	meta: FieldFormatMeta & {
		treeFieldConfig: FieldConfig<FieldTypes>;
		treeChildFields: FieldConfig<FieldTypes>[];
		treeLevel: number;
		groupRef?: string;
	},
): InternalDocumentFieldGroup[] => {
	const groupsRes: InternalDocumentFieldGroup[] = [];

	//* using DocumentBricksFormatter.getBrickTreeRows, get the target tree-table rows and construct groups from them
	const treeRows = DocumentBricksFormatter.getBrickTreeRows({
		bricksQuery: data.bricksQuery,
		bricksSchema: data.bricksSchema,
		collectionKey: meta.collection.key,
		brickKey: meta.brickKey,
		treeFieldKey: meta.treeFieldConfig.key,
		treeLevel: meta.treeLevel,
		relationIds: data.brickRows.flatMap((b) => b.id),
	});

	//* group locale rows by their persistent item identity
	const groups = Map.groupBy(treeRows, (item) => {
		return item.group_instance_id;
	});
	groups.forEach((localeRows) => {
		//* open state is shared for now - if this is to change in the future, the insert/response format for this needs changing
		const openState = localeRows[0]?.is_open ?? false;
		const ref = localeRows[0]?.group_instance_id;
		if (!ref) return;

		groupsRes.push({
			ref: ref,
			order: localeRows[0]?.position ?? 0,
			open: formatter.formatBoolean(openState),
			fields: buildFieldTree(
				{
					brickRows: localeRows,
					bricksQuery: data.bricksQuery,
					bricksSchema: data.bricksSchema,
					refs: data.refs,
				},
				{
					builder: meta.builder,
					host: meta.host,
					localization: meta.localization,
					collection: meta.collection,
					brickKey: meta.brickKey,
					fieldConfig: meta.treeChildFields,
					treeLevel: meta.treeLevel + 1,
					config: meta.config,
					groupRef: ref,
					bricksTableSchema: meta.bricksTableSchema,
					editable: meta.editable,
				},
			),
		});
	});

	return groupsRes.sort((a, b) => a.order - b.order);
};

/**
 * Returns fields as an object, with the keys being the custom field keys instead of an array of fields
 */
const objectifyFields = (
	fields: InternalDocumentField[],
): Record<string, DocumentField> => {
	return fields.reduce(
		(acc, field) => {
			if (!field) return acc;

			acc[field.key] = {
				...field,
				groups: field.groups?.map((g) => {
					return {
						...g,
						fields: objectifyFields(g.fields || []),
					};
				}),
			} satisfies DocumentField;
			return acc;
		},
		{} as Record<string, DocumentField>,
	);
};

const flattenFieldValue = (
	field: InternalDocumentField,
): DocumentFieldPlainValue => {
	if (field.groups) {
		return field.groups.map((group) => flattenFields(group.fields || []));
	}

	if (field.translations) {
		return field.translations;
	}

	if ("value" in field) {
		return field.value;
	}

	return null;
};

const isStructuralFieldConfig = (
	config: FieldConfig<FieldTypes>,
): config is FieldConfig<"section"> | FieldConfig<"collapsible"> => {
	return config.type === "section" || config.type === "collapsible";
};

/**
 * Walks a content field tree level and collects flattened values into `target`.
 * Tabs are transparent, sections/collapsibles shape their children based on
 * their `output` config and repeater groups recurse with their child configs.
 */
const collectContentFieldValues = (
	target: DocumentFieldValueMap,
	fieldMap: Map<string, InternalDocumentField>,
	configs: FieldConfig<FieldTypes>[],
): void => {
	for (const config of configs) {
		if (config.type === "tab") {
			collectContentFieldValues(target, fieldMap, config.fields);
			continue;
		}

		if (isStructuralFieldConfig(config)) {
			if (config.output === "inline") {
				collectContentFieldValues(target, fieldMap, config.fields);
			} else {
				const nested: DocumentFieldValueMap = {};
				collectContentFieldValues(nested, fieldMap, config.fields);
				target[config.key] = nested;
			}
			continue;
		}

		const field = fieldMap.get(config.key);
		if (!field) continue;

		if (field.groups) {
			const childConfigs =
				"fields" in config && Array.isArray(config.fields)
					? (config.fields as FieldConfig<FieldTypes>[])
					: undefined;
			target[config.key] = field.groups.map((group) =>
				flattenFields(group.fields || [], childConfigs),
			);
			continue;
		}

		target[config.key] = flattenFieldValue(field);
	}
};

/**
 * Flattens fields into the content value map. When a content field tree is
 * provided, sections/collapsibles shape their children based on their
 * `output` config - nested under their key or inlined as if absent.
 */
const flattenFields = (
	fields: InternalDocumentField[],
	contentFieldTree?: FieldConfig<FieldTypes>[],
): DocumentFieldValueMap => {
	if (!contentFieldTree) {
		return fields.reduce((acc, field) => {
			if (!field) return acc;

			acc[field.key] = flattenFieldValue(field);
			return acc;
		}, {} as DocumentFieldValueMap);
	}

	const fieldMap = new Map(
		fields.filter((field) => !!field).map((field) => [field.key, field]),
	);
	const result: DocumentFieldValueMap = {};
	collectContentFieldValues(result, fieldMap, contentFieldTree);
	return result;
};

export default {
	formatMultiple,
	objectifyFields,
	flattenFields,
};
