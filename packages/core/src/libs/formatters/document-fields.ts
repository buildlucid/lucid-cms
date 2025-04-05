import Formatter from "./index.js";
import constants from "../../constants/constants.js";
import DocumentBricksFormatter from "./document-bricks.js";
import type {
	CFConfig,
	Config,
	FieldGroupResponse,
	FieldResponse,
	FieldResponseMeta,
	FieldResponseValue,
	FieldTypes,
	LucidBricksTable,
	LucidBrickTableName,
} from "../../types.js";
import type { BrickBuilder, CollectionBuilder } from "../../builders.js";
import type { BrickQueryResponse } from "../repositories/document-bricks.js";
import type { CollectionSchemaTable } from "../../services/collection-migrator/schema/types.js";
import type { FieldRelationResponse } from "../../services/documents-bricks/helpers/fetch-relation-data.js";
import prefixGeneratedColName from "../../services/collection-migrator/helpers/prefix-generated-column-name.js";

export interface FieldFormatMeta {
	builder: BrickBuilder | CollectionBuilder;
	host: string;
	collection: CollectionBuilder;
	localisation: {
		locales: string[];
		default: string;
	};
	/** Used to help workout the target brick schema item and the table name. Set to `undefined` if the brick table you're creating fields for is the `document-fields` one */
	brickKey: string | undefined;
}

interface FieldFormatData {
	/** The filtered target brick table rows, grouped by position, each row represent a different locale for the same brick instance */
	brickRows: LucidBricksTable[];
	/** The entire bricksQuery response data - used to select repeater rows from later */
	bricksQuery: BrickQueryResponse;
	/** The schema for the entire collection and all possible bricks */
	bricksSchema: Array<CollectionSchemaTable<LucidBrickTableName>>;
	/** All relation meta data, users, media, documents etc. Used to populate the field meta data based on the CF type and value */
	relationMetaData: FieldRelationResponse;
}

interface IntermediaryFieldValues {
	value: unknown;
	locale: string;
}

export default class DocumentFieldsFormatter {
	/**
	 * The entry point for building out the FieldResponse array.
	 *
	 * Formats, creates groups, creates nested structure, marries relationMetaData etc.
	 */
	formatMultiple = (
		data: FieldFormatData,
		meta: FieldFormatMeta,
	): FieldResponse[] => {
		return this.buildFieldTree(data, {
			builder: meta.builder,
			fieldConfig: meta.builder.fieldTreeNoTab,
			host: meta.host,
			localisation: meta.localisation,
			collection: meta.collection,
			brickKey: meta.brickKey,
		});
	};

	/**
	 *  Recursively build out the FieldResponse based on the nested fieldConfig
	 */
	private buildFieldTree = (
		data: FieldFormatData,
		meta: FieldFormatMeta & {
			fieldConfig: CFConfig<FieldTypes>[];
			repeaterLevel?: number;
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
					groups: this.buildGroups(data, {
						builder: meta.builder,
						repeaterConfig: config,
						host: meta.host,
						localisation: meta.localisation,
						collection: meta.collection,
						brickKey: meta.brickKey,
						repeaterLevel: meta.repeaterLevel || 0,
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

			const fieldValue = this.buildField(
				{
					values: fieldValues,
				},
				{
					builder: meta.builder,
					fieldConfig: config,
					host: meta.host,
					localisation: meta.localisation,
					collection: meta.collection,
					brickKey: meta.brickKey,
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
	 * @TODO add group, groupid supports and address TODO comments in block
	 */
	private buildField = (
		data: {
			values: IntermediaryFieldValues[];
		},
		meta: FieldFormatMeta & {
			fieldConfig: CFConfig<FieldTypes>;
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
			const fieldMeta: Record<string, FieldResponseMeta> = {};

			//* populate the translations/meta
			for (const locale of meta.localisation.locales) {
				const localeValue = data.values.find((v) => v.locale === locale);

				if (localeValue) {
					// TODO: use the cfInstance to format the value and meta data.
					fieldTranslations[locale] = localeValue.value as FieldResponseValue;
					// TODO: add helper to get field meta values
					fieldMeta[locale] = null;
				} else {
					fieldTranslations[locale] = null;
					fieldMeta[locale] = null;
				}
			}

			return {
				key: meta.fieldConfig.key,
				type: meta.fieldConfig.type,
				translations: fieldTranslations,
				meta: fieldMeta,
			};
		}

		//* otherwise use the value key to just store the default locales value
		const defaultValue = data.values.find(
			(f) => f.locale === meta.localisation.default,
		);
		if (!defaultValue) return null;

		return {
			key: meta.fieldConfig.key,
			type: meta.fieldConfig.type,
			// TODO: use the cfInstance to format the value and meta data.
			value: defaultValue.value as FieldResponseValue,
			// TODO: add helper to get field meta values
			meta: null,
		};
	};

	/**
	 *
	 */
	private buildGroups = (
		data: FieldFormatData,
		meta: FieldFormatMeta & {
			repeaterConfig: CFConfig<"repeater">;
			brickKey: string | undefined;
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
		});

		// console.log(repeaterTables);

		return groupsRes;
	};

	static swagger = {
		type: "object",
		additionalProperties: true,
		properties: {
			key: {
				type: "string",
			},
			type: {
				type: "string",
				enum: [
					"tab",
					"text",
					"wysiwyg",
					"media",
					"number",
					"checkbox",
					"select",
					"textarea",
					"json",
					"colour",
					"datetime",
					"link",
					"repeater",
					"user",
				],
			},
			groupId: {
				type: "number",
				nullable: true,
			},
			collectionDocumentId: {
				type: "number",
			},
			translations: {
				type: "object",
				additionalProperties: true,
			},
			value: {},
			meta: {
				type: "object",
				additionalProperties: true,
				nullable: true,
				properties: {
					id: {
						type: "number",
						nullable: true,
					},
					url: {
						type: "string",
						nullable: true,
					},
					key: {
						type: "string",
						nullable: true,
					},
					mimeType: {
						type: "string",
						nullable: true,
					},
					extension: {
						type: "string",
						nullable: true,
					},
					fileSize: {
						type: "number",
						nullable: true,
					},
					width: {
						type: "number",
						nullable: true,
					},
					height: {
						type: "number",
						nullable: true,
					},
					blurHash: {
						type: "string",
						nullable: true,
					},
					averageColour: {
						type: "string",
						nullable: true,
					},
					isDark: {
						type: "boolean",
						nullable: true,
					},
					isLight: {
						type: "boolean",
						nullable: true,
					},
					title: {
						type: "object",
						additionalProperties: true,
					},
					alt: {
						type: "object",
						additionalProperties: true,
					},
					type: {
						type: "string",
						nullable: true,
						enum: ["image", "video", "audio", "document"],
					},
					email: {
						type: "string",
						nullable: true,
					},
					username: {
						type: "string",
						nullable: true,
					},
					firstName: {
						type: "string",
						nullable: true,
					},
					lastName: {
						type: "string",
						nullable: true,
					},
					fields: {
						type: "object",
						additionalProperties: true,
						nullable: true,
					},
				},
			},
			groups: {
				type: "array",
				items: {
					type: "object",
					additionalProperties: true,
					properties: {
						id: {
							type: "number",
						},
						order: {
							type: "number",
						},
						open: {
							type: "boolean",
							nullable: true,
						},
						fields: {
							type: "array",
							items: {
								type: "object",
								additionalProperties: true,
							},
						},
					},
				},
			},
		},
	};
}
