import Formatter from "./index.js";
import DocumentBricksFormatter from "./document-bricks.js";
import prefixGeneratedColName from "../../services/collection-migrator/helpers/prefix-generated-column-name.js";
import type {
	Config,
	CFConfig,
	FieldGroupResponse,
	FieldResponse,
	FieldResponseMeta,
	FieldResponseValue,
	FieldTypes,
	LucidBricksTable,
	LucidBrickTableName,
	Select,
	FieldAltResponse,
} from "../../types.js";
import type { BrickBuilder, CollectionBuilder } from "../../builders.js";
import type { BrickQueryResponse } from "../repositories/document-bricks.js";
import type { CollectionSchemaTable } from "../../services/collection-migrator/schema/types.js";
import type { FieldRelationResponse } from "../../services/documents-bricks/helpers/fetch-relation-data.js";

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
	config: Config;
}

interface FieldFormatData {
	/** The filtered target brick table rows, grouped by position, each row represent a different locale for the same brick instance */
	brickRows: Select<LucidBricksTable>[];
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
			config: meta.config,
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
						config: meta.config,
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
					relationMetaData: data.relationMetaData,
				},
				{
					builder: meta.builder,
					fieldConfig: config,
					host: meta.host,
					localisation: meta.localisation,
					collection: meta.collection,
					brickKey: meta.brickKey,
					config: meta.config,
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
			relationMetaData: FieldRelationResponse;
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
					fieldTranslations[locale] = cfInstance.formatResponseValue(
						localeValue.value,
					);
					fieldMeta[locale] = cfInstance.formatResponseMeta(
						this.fetchRelationData(data.relationMetaData, {
							type: meta.fieldConfig.type,
							value: localeValue.value,
							fieldConfig: meta.fieldConfig,
						}),
						meta,
					);
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
			value: cfInstance.formatResponseValue(defaultValue.value),
			meta: cfInstance.formatResponseMeta(
				this.fetchRelationData(data.relationMetaData, {
					type: meta.fieldConfig.type,
					value: defaultValue.value,
					fieldConfig: meta.fieldConfig,
				}),
				meta,
			),
		};
	};

	/**
	 * Responsible for building out groups for a repeater field
	 */
	private buildGroups = (
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

			groupsRes.push({
				id: "ignore", // TODO: remove this from type, no longer needed. No such thing as a group ID as a single group spans accross multiple rows due to locales
				order: key,
				open: Formatter.formatBoolean(openState),
				fields: this.buildFieldTree(
					{
						brickRows: localeRows,
						bricksQuery: data.bricksQuery,
						bricksSchema: data.bricksSchema,
						relationMetaData: data.relationMetaData,
					},
					{
						builder: meta.builder,
						host: meta.host,
						localisation: meta.localisation,
						collection: meta.collection,
						brickKey: meta.brickKey,
						fieldConfig: repeaterFields,
						repeaterLevel: meta.repeaterLevel + 1,
						config: meta.config,
					},
				),
			});
		});

		return groupsRes.sort((a, b) => a.order - b.order);
	};

	/**
	 * Returns fields as an object, with the keys being the custom field keys instead of an array of fields
	 */
	objectifyFields = (
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
							fields: this.objectifyFields(g.fields || []),
						};
					}),
				} satisfies FieldAltResponse;
				return acc;
			},
			{} as Record<string, FieldAltResponse>,
		);
	};

	/**
	 * Fetch relation meta data
	 */
	private fetchRelationData = <T extends FieldTypes>(
		relationData: FieldRelationResponse,
		props: {
			type: T;
			value: unknown;
			fieldConfig: CFConfig<T>;
		},
	) => {
		switch (props.type) {
			case "document": {
				return (relationData.document as Array<BrickQueryResponse>).find(
					(d) => {
						return (
							d.collection_key ===
								(props.fieldConfig as CFConfig<"document">)?.collection &&
							d.id === props.value
						);
					},
				);
			}
			default: {
				return relationData[props.type]?.find((i) => i?.id === props.value);
			}
		}
	};

	/**
	 * The swagger response schema
	 */
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
