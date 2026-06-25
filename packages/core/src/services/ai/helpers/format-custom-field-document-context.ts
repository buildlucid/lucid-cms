import type { RichTextJSON } from "@lucidcms/rich-text";
import { generateHTML } from "@lucidcms/rich-text/server";
import type BrickBuilder from "../../../libs/collection/builders/brick-builder/index.js";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import type CustomField from "../../../libs/collection/custom-fields/custom-field.js";
import registeredFields from "../../../libs/collection/custom-fields/registered-fields.js";
import { isStorageMode } from "../../../libs/collection/custom-fields/storage/index.js";
import type {
	CFConfig,
	FieldTypes,
} from "../../../libs/collection/custom-fields/types.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";
import { tenantAccessAllowed } from "../../../utils/helpers/index.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTranslatedFieldDetails from "./get-translated-field-details.js";

type DocumentInput = {
	fields?: FieldInputSchema[];
	bricks?: BrickInputSchema[];
};

type FormatProps = {
	context: ServiceContext;
	collection: CollectionBuilder;
	document?: DocumentInput;
};

type DocumentContextFieldInput = FieldInputSchema;

type DocumentContextFields = Record<string, unknown>;

type DocumentContext = {
	fields: DocumentContextFields;
	bricks: Array<{
		key: string;
		type: "builder" | "fixed";
		fields: DocumentContextFields;
	}>;
};

type DefinitionField = {
	type: FieldTypes;
	label?: string;
	summary?: string;
	localized: boolean;
	collection?: string | string[];
	multiple?: boolean;
	options?: Array<{
		value: string;
		label?: string;
	}>;
	fields?: Record<string, DefinitionField>;
};

type DefinitionBrick = {
	name?: string;
	summary?: string;
	fields: Record<string, DefinitionField>;
};

type CollectionDefinition = {
	fields: Record<string, DefinitionField>;
	fixedBricks: Record<string, DefinitionBrick>;
	builderBricks: Record<string, DefinitionBrick>;
};

// TODO: should belong on the CF
const formatRichTextValue = (value: unknown) => {
	if (!value || typeof value !== "object") return value;

	try {
		return generateHTML(value as RichTextJSON);
	} catch {
		return value;
	}
};

const formatFieldValue = (
	fieldInstance: CustomField<FieldTypes>,
	value: unknown,
) => {
	if (fieldInstance.type === "rich-text") {
		return formatRichTextValue(value);
	}

	return value;
};

const formatFieldTranslations = (
	fieldInstance: CustomField<FieldTypes>,
	translations: Record<string, unknown>,
) => {
	if (fieldInstance.type !== "rich-text") return translations;

	return Object.fromEntries(
		Object.entries(translations).map(([locale, value]) => [
			locale,
			formatRichTextValue(value),
		]),
	);
};

/**
 * Formats nested tree-table groups as ordered value objects.
 */
const getTreeFieldGroups = (
	field: DocumentContextFieldInput,
	fieldInstances: Map<string, CustomField<FieldTypes>>,
) => {
	const groups =
		field.groups
			?.toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0))
			.map((group) => formatFields(group.fields, fieldInstances)) ?? [];

	if (groups.length === 0) return undefined;

	return groups;
};

/**
 * Formats request document fields into a key-value prompt context object.
 */
const formatFields = (
	fields: DocumentContextFieldInput[] | undefined,
	fieldInstances: Map<string, CustomField<FieldTypes>>,
): DocumentContextFields => {
	if (!fields?.length) return {};

	return fields.reduce<DocumentContextFields>((acc, field) => {
		const fieldInstance = fieldInstances.get(field.key);
		if (!fieldInstance) return acc;
		if (field.type !== fieldInstance.type) return acc;

		const databaseConfig = registeredFields[fieldInstance.type].config.database;
		const groups = isStorageMode(databaseConfig, "tree-table")
			? getTreeFieldGroups(field, fieldInstances)
			: undefined;

		if (groups !== undefined) {
			acc[fieldInstance.key] = groups;
			return acc;
		}

		if (field.translations !== undefined) {
			acc[fieldInstance.key] = formatFieldTranslations(
				fieldInstance,
				field.translations,
			);
			return acc;
		}

		if (field.value !== undefined) {
			acc[fieldInstance.key] = formatFieldValue(fieldInstance, field.value);
		}

		return acc;
	}, {});
};

/**
 * Finds the collection brick instance that owns a request brick.
 */
const getBrickInstance = (
	collection: CollectionBuilder,
	brick: BrickInputSchema,
): BrickBuilder | undefined => {
	return collection.brickInstances.find((instance) => {
		return instance.key === brick.key;
	});
};

/**
 * Returns nested field config for fields that carry child fields.
 */
const getNestedFieldConfig = (
	field: CFConfig<FieldTypes>,
): CFConfig<FieldTypes>[] | undefined => {
	if (!("fields" in field)) return undefined;
	if (!Array.isArray(field.fields)) return undefined;
	return field.fields as CFConfig<FieldTypes>[];
};

/**
 * Translates select options for field definitions.
 */
const getOptionsDefinition = (
	context: ServiceContext,
	field: CFConfig<FieldTypes>,
) => {
	if (!("options" in field)) return undefined;
	if (!Array.isArray(field.options)) return undefined;

	const translate = context.translate.forLocale(
		context.config.i18n.defaultLocale,
	);
	const options = field.options.flatMap((option) => {
		if (typeof option.value !== "string") return [];

		const label = translate(option.label);

		return [
			{
				value: option.value,
				...(label ? { label } : {}),
			},
		];
	});

	if (options.length === 0) return undefined;

	return options;
};

/**
 * Returns relation collection targets for field definitions.
 */
const getCollectionTargets = (field: CFConfig<FieldTypes>) => {
	if (!("collection" in field)) return undefined;
	return field.collection;
};

/**
 * Returns relation multiplicity for field definitions.
 */
const getMultiple = (field: CFConfig<FieldTypes>) => {
	if (!("multiple" in field)) return undefined;
	if (typeof field.multiple !== "boolean") return undefined;

	return field.multiple;
};

/**
 * Formats collection field definitions into a key-based lookup.
 */
const formatFieldDefinitions = (props: {
	context: ServiceContext;
	collection: CollectionBuilder;
	fields: CFConfig<FieldTypes>[];
	instances: Map<string, CustomField<FieldTypes>>;
}): Record<string, DefinitionField> => {
	return props.fields.reduce<Record<string, DefinitionField>>((acc, field) => {
		const fieldInstance = props.instances.get(field.key);
		if (!fieldInstance) return acc;
		if (field.type !== fieldInstance.type) return acc;

		const nestedFields = getNestedFieldConfig(field);
		const details = getTranslatedFieldDetails(props.context, fieldInstance);
		const collection = getCollectionTargets(field);
		const multiple = getMultiple(field);
		const options = getOptionsDefinition(props.context, field);

		acc[fieldInstance.key] = {
			type: fieldInstance.type,
			localized:
				props.collection.getData.features.localized === true &&
				fieldInstance.localizedEnabled === true,
			...(details?.label ? { label: details.label } : {}),
			...(details?.summary ? { summary: details.summary } : {}),
			...(collection ? { collection } : {}),
			...(multiple !== undefined ? { multiple } : {}),
			...(options ? { options } : {}),
			...(nestedFields
				? {
						fields: formatFieldDefinitions({
							context: props.context,
							collection: props.collection,
							fields: nestedFields,
							instances: props.instances,
						}),
					}
				: {}),
		};

		return acc;
	}, {});
};

/**
 * Translates brick details for collection definitions.
 */
export const getTranslatedBrickDetails = (
	context: ServiceContext,
	brick: BrickBuilder,
) => {
	const translate = context.translate.forLocale(
		context.config.i18n.defaultLocale,
	);
	const name = translate(brick.config.details.name);
	const summary = translate(brick.config.details.summary);

	if (!name && !summary) return undefined;

	return {
		...(name ? { name } : {}),
		...(summary ? { summary } : {}),
	};
};

/**
 * Formats brick definitions into a key-based lookup.
 */
const formatBrickDefinitions = (props: {
	context: ServiceContext;
	collection: CollectionBuilder;
	bricks?: BrickBuilder[];
}): Record<string, DefinitionBrick> => {
	return (props.bricks ?? [])
		.filter((brick) =>
			tenantAccessAllowed(
				brick.config.tenants,
				props.context.request.tenantKey,
			),
		)
		.reduce<Record<string, DefinitionBrick>>((acc, brick) => {
			const details = getTranslatedBrickDetails(props.context, brick);

			acc[brick.key] = {
				...(details ?? {}),
				fields: formatFieldDefinitions({
					context: props.context,
					collection: props.collection,
					fields: brick.fieldTree,
					instances: brick.fields,
				}),
			};

			return acc;
		}, {});
};

/**
 * Builds the collection definition sent to the remote custom-field AI request.
 */
export const formatCustomFieldCollectionDefinition = (props: {
	context: ServiceContext;
	collection: CollectionBuilder;
}): CollectionDefinition => {
	return {
		fields: formatFieldDefinitions({
			context: props.context,
			collection: props.collection,
			fields: props.collection.fieldTree,
			instances: props.collection.fields,
		}),
		fixedBricks: formatBrickDefinitions({
			context: props.context,
			collection: props.collection,
			bricks: props.collection.config.bricks?.fixed,
		}),
		builderBricks: formatBrickDefinitions({
			context: props.context,
			collection: props.collection,
			bricks: props.collection.config.bricks?.builder,
		}),
	};
};

/**
 * Builds the document context sent to the remote custom-field AI request.
 */
const formatCustomFieldDocumentContext = (
	props: FormatProps,
): DocumentContext => {
	return {
		fields: formatFields(props.document?.fields, props.collection.fields),
		bricks:
			props.document?.bricks?.flatMap((brick) => {
				const brickInstance = getBrickInstance(props.collection, brick);
				if (!brickInstance) return [];
				if (
					!tenantAccessAllowed(
						brickInstance.config.tenants,
						props.context.request.tenantKey,
					)
				) {
					return [];
				}

				return [
					{
						key: brick.key,
						type: brick.type,
						fields: formatFields(brick.fields, brickInstance.fields),
					},
				];
			}) ?? [],
	};
};

export default formatCustomFieldDocumentContext;
