import formatter from "./index.js";
import DocumentBricksFormatter from "./document-bricks.js";
import crypto from "node:crypto";
import prefixGeneratedColName from "../collection/helpers/prefix-generated-column-name.js";
import type {
	Config,
	CFConfig,
	FieldGroupResponse,
	FieldResponse,
	FieldResponseValue,
	FieldTypes,
	LucidBricksTable,
	LucidBrickTableName,
	Select,
	FieldAltResponse,
} from "../../types.js";
import type BrickBuilder from "../builders/brick-builder/index.js";
import type CollectionBuilder from "../builders/collection-builder/index.js";
import type { BrickQueryResponse } from "../repositories/document-bricks.js";
import type { CollectionSchemaTable } from "../collection/schema/types.js";
import type { FieldRelationResponse } from "../../services/documents-bricks/helpers/fetch-relation-data.js";
import type { DocumentQueryResponse } from "../repositories/documents.js";

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
	/** The entire bricksQuery or DocumentQueryResponse response data - used to select repeater rows from later */
	bricksQuery: BrickQueryResponse | DocumentQueryResponse;
	/** The schema for the entire collection and all possible bricks */
	bricksSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
	/** All relation meta data, users, media, documents etc. Used to populate the field meta data based on the CF type and value */
	relationMetaData: FieldRelationResponse;
}

interface IntermediaryFieldValues {
	value: unknown;
	locale: string;
}

/**
 * The entry point for building out the FieldResponse array.
 *
 * Formats, creates groups, creates nested structure, marries relationMetaData etc.
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
		repeaterLevel?: number;
		groupRef?: string;
	},
): FieldResponse[] => {
	const fieldsRes: FieldResponse[] = [];

	//* loop over fieldConfig (nested field structure - no tabs)
	for (const config of meta.fieldConfig) {
		if (config.type === "repeater") {
			//* recursively build out repeater groups
			fieldsRes.push({
				key: config.key,
				type: config.type,
				groupRef: meta.groupRef,
				groups: buildGroups(data, {
					builder: meta.builder,
					repeaterConfig: config,
					host: meta.host,
					localization: meta.localization,
					collection: meta.collection,
					brickKey: meta.brickKey,
					repeaterLevel: meta.repeaterLevel || 0,
					config: meta.config,
					bricksTableSchema: meta.bricksTableSchema,
				}),
			});
			continue;
		}

		const fieldKey = prefixGeneratedColName(config.key);

		//* get all instaces of this field (config.key) accross the data.brickRows (so the value for each locale)
		const fieldValues: IntermediaryFieldValues[] = data.brickRows.flatMap(
			(row) => ({
				value: row[fieldKey],
				locale: row.locale,
			}),
		);

		const fieldValue = buildField(
			{
				values: fieldValues,
				relationMetaData: data.relationMetaData,
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
		relationMetaData: FieldRelationResponse;
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
		meta.fieldConfig.type !== "repeater" &&
		meta.fieldConfig.type !== "tab" &&
		meta.fieldConfig.config.useTranslations === true &&
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
 * Responsible for building out groups for a repeater field
 */
const buildGroups = (
	data: FieldFormatData,
	meta: FieldFormatMeta & {
		repeaterConfig: CFConfig<"repeater">;
		repeaterLevel: number;
	},
): FieldGroupResponse[] => {
	const groupsRes: FieldGroupResponse[] = [];

	const repeaterFields = meta.repeaterConfig.fields;
	if (!repeaterFields) return groupsRes;

	//* using DocumentBricksFormatter.getBrickRepeaterRows, get the target repeater brick table rows and construct groups from them
	const repeaterTables = DocumentBricksFormatter.getBrickRepeaterRows({
		bricksQuery: data.bricksQuery,
		bricksSchema: data.bricksSchema,
		collectionKey: meta.collection.key,
		brickKey: meta.brickKey,
		repeaterKey: meta.repeaterConfig.key,
		repeaterLevel: meta.repeaterLevel,
		relationIds: data.brickRows.flatMap((b) => b.id),
	});

	//* group by the position
	const groups = Map.groupBy(repeaterTables, (item) => {
		return item.position;
	});
	groups.forEach((localeRows, key) => {
		//* open state is shared for now - if this is to change in the future, the insert/response format for this needs changing
		const openState = localeRows[0]?.is_open ?? false;
		const ref = crypto.randomUUID();

		groupsRes.push({
			ref: ref,
			order: key,
			open: formatter.formatBoolean(openState),
			fields: buildFieldTree(
				{
					brickRows: localeRows,
					bricksQuery: data.bricksQuery,
					bricksSchema: data.bricksSchema,
					relationMetaData: data.relationMetaData,
				},
				{
					builder: meta.builder,
					host: meta.host,
					localization: meta.localization,
					collection: meta.collection,
					brickKey: meta.brickKey,
					fieldConfig: repeaterFields,
					repeaterLevel: meta.repeaterLevel + 1,
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

export default {
	formatMultiple,
	objectifyFields,
};
