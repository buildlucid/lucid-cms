import crypto from "node:crypto";
import type { FieldRefResponse } from "../../services/documents-bricks/helpers/fetch-ref-data.js";
import type {
	CFConfig,
	Config,
	FieldAltResponse,
	FieldGroupResponse,
	FieldResponse,
	FieldResponseValue,
	FieldTypes,
	LucidBricksTable,
	LucidBrickTableName,
	Select,
} from "../../types.js";
import type BrickBuilder from "../collection/builders/brick-builder/index.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import registeredFields from "../collection/custom-fields/registered-fields.js";
import { isStorageMode } from "../collection/custom-fields/storage/index.js";
import prefixGeneratedColName from "../collection/helpers/prefix-generated-column-name.js";
import type { CollectionSchemaTable } from "../collection/schema/types.js";
import type { BrickQueryResponse } from "../repositories/document-bricks.js";
import type { DocumentQueryResponse } from "../repositories/documents.js";
import DocumentBricksFormatter from "./document-bricks.js";
import formatter from "./index.js";

export interface FieldFormatMeta {
	builder: BrickBuilder | CollectionBuilder;
	host: string;
	collection: CollectionBuilder;
	localization: {
		locales: string[];
		default: string;
	};
	/** Used to help workout the target brick schema item and the table name. Set to `undefined` if the brick table you're creating fields for is the `document-fields` one */
	brickKey: string | undefined;
	config: Config;
	bricksTableSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
}

interface FieldFormatData {
	/** The filtered target brick table rows, grouped by position, each row represent a different locale for the same brick instance */
	brickRows: Select<LucidBricksTable>[];
	/** The entire bricksQuery or DocumentQueryResponse response data - used to select tree-table rows from later */
	bricksQuery: BrickQueryResponse | DocumentQueryResponse;
	/** The schema for the entire collection and all possible bricks */
	bricksSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
	/** All relation meta data, users, media, documents etc. Used to populate the field meta data based on the CF type and value */
	refData: FieldRefResponse;
}

interface IntermediaryFieldValues {
	value: unknown;
	locale: string;
}

/**
 * Resolves the localized values for a field from either parent rows or relation rows.
 */
const getFieldValues = (
	data: FieldFormatData,
	meta: FieldFormatMeta & {
		fieldConfig: CFConfig<FieldTypes>;
	},
): IntermediaryFieldValues[] => {
	const fieldInstance = meta.builder.fields.get(meta.fieldConfig.key);
	if (!fieldInstance) return [];

	const databaseConfig =
		registeredFields[meta.fieldConfig.type].config.database;
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

	return meta.localization.locales.map((locale) => {
		const localeValues = relationRows
			.filter((row) => row.locale === locale)
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
	return isStorageMode(registeredFields[type].config.database, "tree-table");
};

const getTreeTableChildFieldConfig = (
	field: CFConfig<FieldTypes>,
): CFConfig<FieldTypes>[] | null => {
	if (!isTreeTableFieldType(field.type)) return null;
	if (!("fields" in field)) return null;
	if (!Array.isArray(field.fields)) return null;
	return field.fields as CFConfig<FieldTypes>[];
};

/**
 * The entry point for building out the FieldResponse array.
 *
 * Formats, creates groups, creates nested structure, marries refData etc.
 */
const formatMultiple = (
	data: FieldFormatData,
	meta: FieldFormatMeta,
): FieldResponse[] => {
	return buildFieldTree(data, {
		builder: meta.builder,
		fieldConfig: meta.builder.fieldTreeNoTab,
		host: meta.host,
		localization: meta.localization,
		collection: meta.collection,
		brickKey: meta.brickKey,
		config: meta.config,
		bricksTableSchema: meta.bricksTableSchema,
	});
};

/**
 *  Recursively build out the FieldResponse based on the nested fieldConfig
 */
const buildFieldTree = (
	data: FieldFormatData,
	meta: FieldFormatMeta & {
		fieldConfig: CFConfig<FieldTypes>[];
		treeLevel?: number;
		groupRef?: string;
	},
): FieldResponse[] => {
	const fieldsRes: FieldResponse[] = [];

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
		});

		const fieldValue = buildField(
			{
				values: fieldValues,
				refData: data.refData,
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
			},
		);
		if (fieldValue) fieldsRes.push(fieldValue);
	}

	return fieldsRes;
};

/**
 * Responsible for building a single FieldResponse object.
 *
 * Adds in empty locale values, formats the value and constructs either translations or values based on the fields config
 */
const buildField = (
	data: {
		values: IntermediaryFieldValues[];
		refData: FieldRefResponse;
	},
	meta: FieldFormatMeta & {
		fieldConfig: CFConfig<FieldTypes>;
		groupRef?: string;
	},
): FieldResponse | null => {
	const cfInstance = meta.builder.fields.get(meta.fieldConfig.key);
	if (!cfInstance) return null;

	//* if the field supports translations, use the translations field key
	if (
		!isTreeTableFieldType(meta.fieldConfig.type) &&
		meta.fieldConfig.type !== "tab" &&
		cfInstance.translationsEnabled === true &&
		meta.collection.getData.config.useTranslations === true
	) {
		const fieldTranslations: Record<string, FieldResponseValue> = {};

		//* populate the translations/meta
		for (const locale of meta.localization.locales) {
			const localeValue = data.values.find((v) => v.locale === locale);

			if (localeValue) {
				fieldTranslations[locale] = cfInstance.formatResponseValue(
					localeValue.value,
				);
			} else {
				fieldTranslations[locale] = null;
			}
		}

		return {
			key: meta.fieldConfig.key,
			type: meta.fieldConfig.type,
			groupRef: meta.groupRef,
			translations: fieldTranslations,
		};
	}

	//* otherwise use the value key to just store the default locales value
	const defaultValue = data.values.find(
		(f) => f.locale === meta.localization.default,
	);
	if (!defaultValue) return null;

	return {
		key: meta.fieldConfig.key,
		type: meta.fieldConfig.type,
		value: cfInstance.formatResponseValue(defaultValue.value),
		groupRef: meta.groupRef,
	};
};

/**
 * Responsible for building out groups for a tree-table field
 */
const buildTreeGroups = (
	data: FieldFormatData,
	meta: FieldFormatMeta & {
		treeFieldConfig: CFConfig<FieldTypes>;
		treeChildFields: CFConfig<FieldTypes>[];
		treeLevel: number;
		groupRef?: string;
	},
): FieldGroupResponse[] => {
	const groupsRes: FieldGroupResponse[] = [];

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

	//* group by the position
	const groups = Map.groupBy(treeRows, (item) => {
		return item.position;
	});
	groups.forEach((localeRows, key) => {
		//* open state is shared for now - if this is to change in the future, the insert/response format for this needs changing
		const openState = localeRows[0]?.is_open ?? false;
		const ref = generateGroupRef(
			meta.collection.key,
			meta.brickKey,
			meta.treeFieldConfig.key,
			key,
			meta.treeLevel,
			meta.groupRef,
		);

		groupsRes.push({
			ref: ref,
			order: key,
			open: formatter.formatBoolean(openState),
			fields: buildFieldTree(
				{
					brickRows: localeRows,
					bricksQuery: data.bricksQuery,
					bricksSchema: data.bricksSchema,
					refData: data.refData,
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
	fields: FieldResponse[],
): Record<string, FieldAltResponse> => {
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
			} satisfies FieldAltResponse;
			return acc;
		},
		{} as Record<string, FieldAltResponse>,
	);
};

/**
 * Generates a unique deterministic reference for a group
 */
const generateGroupRef = (
	collectionKey: string,
	brickKey: string | undefined,
	treeFieldKey: string,
	position: number,
	treeLevel: number,
	parentGroupRef?: string,
): string => {
	return crypto
		.createHash("sha256")
		.update(
			`${collectionKey}-${brickKey || "document"}-${treeFieldKey}-${position}-${treeLevel}-${parentGroupRef || "root"}`,
		)
		.digest("hex")
		.substring(0, 36);
};

export default {
	formatMultiple,
	objectifyFields,
};
