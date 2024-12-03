import type {
	FieldResponse,
	FieldGroupResponse,
	FieldAltResponse,
} from "../../types/response.js";
import type { JSONString, BooleanInt } from "../db/types.js";
import type CollectionBuilder from "../builders/collection-builder/index.js";
import type BrickBuilder from "../builders/brick-builder/index.js";
import type { BrickProp, GroupProp } from "./collection-document-bricks.js";
import type {
	CFConfig,
	FieldTypes,
	FieldResponseMeta,
	FieldResponseValue,
	RepeaterFieldConfig,
	TabFieldConfig,
} from "../custom-fields/types.js";

export interface FieldProp {
	fields_id: number;
	collection_brick_id: number | null;
	collection_document_version_id: number;
	group_id?: number | null;
	locale_code: string;
	key: string;
	type: string;
	text_value: string | null;
	int_value: number | null;
	bool_value: BooleanInt | null;
	json_value?: JSONString | null;
	user_id?: number | null;
	user_email?: string | null;
	user_first_name?: string | null;
	user_last_name?: string | null;
	user_username?: string | null;
	document_id?: number | null;
	media_id?: number | null;
	media_key?: string | null;
	media_mime_type?: string | null;
	media_file_extension?: string | null;
	media_file_size?: number | null;
	media_width?: number | null;
	media_height?: number | null;
	media_type?: string | null;
	media_blur_hash?: string | null;
	media_average_colour?: string | null;
	media_is_dark?: BooleanInt | null;
	media_is_light?: BooleanInt | null;
	media_title_translations?: Array<{
		value: string | null;
		locale_code: string | null;
	}>;
	media_alt_translations?: Array<{
		value: string | null;
		locale_code: string | null;
	}>;
	document_fields?: Array<FieldProp>;
	document_groups?: Array<GroupProp>;
}
export interface FieldFormatMeta {
	builder: BrickBuilder | CollectionBuilder;
	host: string;
	collectionTranslations: boolean;
	localisation: {
		locales: string[];
		default: string;
	};
	collections: CollectionBuilder[];
}

export default class CollectionDocumentFieldsFormatter {
	formatMultiple = (
		data: {
			fields: FieldProp[];
			groups: BrickProp["groups"];
		},
		meta: FieldFormatMeta,
	): FieldResponse[] => {
		const fieldConfigTree = meta.builder.fieldTreeNoTab;
		const sortedGroups = data.groups.sort(
			(a, b) => a.group_order - b.group_order,
		);

		return this.buildFieldTree(
			{
				fields: data.fields,
				groups: sortedGroups,
			},
			{
				builder: meta.builder,
				fieldConfig: fieldConfigTree,
				host: meta.host,
				localisation: meta.localisation,
				collectionTranslations: meta.collectionTranslations,
				groupId: null,
				parentGroupId: null,
				collections: meta.collections,
			},
		);
	};
	formatMultipleFlat = (
		data: {
			fields: FieldProp[];
		},
		meta: FieldFormatMeta,
	): FieldResponse[] => {
		if (data.fields.length === 0) return [];
		const fieldsRes: FieldResponse[] = [];
		const flatFields = meta.builder.flatFields;

		for (const fieldConfig of flatFields) {
			const fieldData = data.fields
				.filter((f) => f.key === fieldConfig.key)
				.filter((f) => {
					if (f.type === "repeater") return false;
					if (f.type === "tab") return false;
					return true;
				});

			if (fieldData.length === 0) continue;

			const field = this.buildField(
				{
					fields: fieldData,
				},
				{
					builder: meta.builder,
					fieldConfig: fieldConfig,
					host: meta.host,
					includeGroupId: true,
					collectionTranslations: meta.collectionTranslations,
					localisation: meta.localisation,
					collections: meta.collections,
				},
			);
			if (field) fieldsRes.push(field);
		}

		return fieldsRes;
	};

	// Helpers
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
	// Private methods
	private buildFieldTree = (
		data: {
			fields: FieldProp[];
			groups: BrickProp["groups"];
		},
		meta: FieldFormatMeta & {
			fieldConfig: CFConfig<FieldTypes>[];
			groupId: number | null;
			parentGroupId: number | null;
		},
	): FieldResponse[] => {
		const fieldsRes: FieldResponse[] = [];

		for (const config of meta.fieldConfig) {
			// recursively build repeater groups
			if (config.type === "repeater") {
				fieldsRes.push({
					key: config.key,
					type: config.type,
					groups: this.buildGroups(
						{
							fields: data.fields,
							groups: data.groups,
						},
						{
							builder: meta.builder,
							repeaterConfig: config,
							host: meta.host,
							parentGroupId: meta.groupId,
							localisation: meta.localisation,
							collectionTranslations: meta.collectionTranslations,
							collections: meta.collections,
						},
					),
				});
				continue;
			}

			// get all fields of that exist in config and the current group level
			const fields = data.fields.filter(
				(f) => f.key === config.key && f.group_id === meta.groupId,
			);
			if (!fields) continue;
			if (fields.length === 0) continue;

			const field = this.buildField(
				{
					fields: fields,
				},
				{
					builder: meta.builder,
					fieldConfig: config,
					host: meta.host,
					includeGroupId: true,
					localisation: meta.localisation,
					collectionTranslations: meta.collectionTranslations,
					collections: meta.collections,
				},
			);
			if (field) fieldsRes.push(field);
		}

		return fieldsRes;
	};
	private buildField = (
		data: {
			fields: FieldProp[];
		},
		meta: FieldFormatMeta & {
			fieldConfig: CFConfig<FieldTypes>;
			includeGroupId: boolean;
		},
	): FieldResponse | null => {
		if (
			meta.fieldConfig.type !== "repeater" &&
			meta.fieldConfig.type !== "tab" &&
			meta.fieldConfig.config.useTranslations === true &&
			meta.collectionTranslations === true
		) {
			// reduce same fields with different languages into 1 field
			// add missing locales with default value to it
			return this.addEmptyLocales(
				{ field: this.reduceFieldLocales(data, meta) },
				{
					fieldConfig: meta.fieldConfig,
					host: meta.host,
					localisation: meta.localisation,
				},
			);
		}

		// get the default locale for that field
		// - if a field doesnt support translations we always use the default locale
		const defaultField = data.fields.find(
			(f) => f.locale_code === meta.localisation.default,
		);
		if (!defaultField) return null;

		const cfInstance = meta.builder.fields.get(meta.fieldConfig.key);
		if (!cfInstance) return null;

		return {
			key: meta.fieldConfig.key,
			type: meta.fieldConfig.type as FieldTypes,
			groupId: meta.includeGroupId
				? (defaultField.group_id ?? undefined)
				: undefined,
			...cfInstance.responseValueFormat({
				data: defaultField,
				formatMeta: meta,
			}),
		};
	};
	private buildGroups = (
		data: {
			fields: FieldProp[];
			groups: BrickProp["groups"];
		},
		meta: FieldFormatMeta & {
			repeaterConfig: CFConfig<"repeater">;
			parentGroupId: number | null;
		},
	): FieldGroupResponse[] => {
		const groups: FieldGroupResponse[] = [];

		const repeaterFields = meta.repeaterConfig.fields;
		if (!repeaterFields) return groups;

		const repeaterGroups = data.groups.filter(
			(g) =>
				g.repeater_key === meta.repeaterConfig.key &&
				g.parent_group_id === meta.parentGroupId,
		);

		for (const group of repeaterGroups) {
			groups.push({
				id: group.group_id,
				order: group.group_order,
				open: group.group_open,
				fields: this.buildFieldTree(
					{
						fields: data.fields,
						groups: data.groups,
					},
					{
						builder: meta.builder,
						fieldConfig: repeaterFields,
						host: meta.host,
						groupId: group.group_id,
						parentGroupId: group.parent_group_id,
						collectionTranslations: meta.collectionTranslations,
						localisation: meta.localisation,
						collections: meta.collections,
					},
				),
			});
		}

		return groups;
	};
	private reduceFieldLocales = (
		data: {
			fields: FieldProp[];
		},
		meta: FieldFormatMeta & {
			fieldConfig: CFConfig<FieldTypes>;
			includeGroupId?: boolean;
		},
	): FieldResponse => {
		return data.fields.reduce<FieldResponse>(
			(acc, field) => {
				const cfInstance = meta.builder.fields.get(meta.fieldConfig.key);
				if (!cfInstance) return acc;

				if (acc.translations === undefined) acc.translations = {};
				if (acc.meta === undefined || acc.meta === null) acc.meta = {};

				if (meta.includeGroupId) acc.groupId = field.group_id ?? undefined;

				const fieldRes = cfInstance.responseValueFormat({
					data: field,
					formatMeta: meta,
				});

				acc.translations[field.locale_code] = fieldRes.value;
				(acc.meta as Record<string, FieldResponseMeta>)[field.locale_code] =
					fieldRes.meta;

				return acc;
			},
			{
				key: meta.fieldConfig.key,
				type: meta.fieldConfig.type,
			},
		);
	};
	private addEmptyLocales = (
		data: {
			field: FieldResponse;
		},
		meta: {
			fieldConfig: Exclude<
				CFConfig<FieldTypes>,
				RepeaterFieldConfig | TabFieldConfig
			>;
			host: string;
			localisation: {
				locales: string[];
				default: string;
			};
		},
	): FieldResponse => {
		if (data.field.translations === undefined) data.field.translations = {};
		if (data.field.meta === undefined) data.field.meta = {};

		const emptyLocales = meta.localisation.locales.filter(
			(l) =>
				!(data.field.translations as Record<string, FieldResponseValue>)[l],
		);
		for (const locale of emptyLocales) {
			(data.field.translations as Record<string, FieldResponseValue>)[locale] =
				meta.fieldConfig.config.default ?? null;
			(data.field.meta as Record<string, FieldResponseMeta>)[locale] = null;
		}
		return data.field;
	};
}
