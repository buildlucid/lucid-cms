import type { FieldInputSchema } from "../../../exports/types.js";
import type BrickBuilder from "../../../libs/collection/builders/brick-builder/index.js";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import { getFieldBuilderState } from "../../../libs/collection/builders/field-builder/index.js";
import type { RichTextValidationData } from "../../../libs/collection/custom-fields/fields/rich-text/types.js";
import registeredFields, {
	registeredFieldTypes,
} from "../../../libs/collection/custom-fields/registered-fields.js";
import { isStorageMode } from "../../../libs/collection/custom-fields/storage/index.js";
import type {
	FieldRelationValidationInput,
	FieldTypes,
} from "../../../libs/collection/custom-fields/types.js";
import { addRefTarget } from "../../../libs/refs/targets.js";
import { DocumentReferencesRepository } from "../../../libs/repositories/index.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { LucidUser } from "../../../types/hono.js";
import type {
	ServiceContext,
	ServiceFn,
} from "../../../utils/services/types.js";
import { analyzeEmbeddedBrickGraph } from "./prepare-bricks-and-fields.js";
import resolveRichTextVariableAccess from "./resolve-rich-text-variable-access.js";

export type ValidationData = Partial<Record<FieldTypes, unknown>>;

type ValidationBuckets = Partial<
	Record<FieldTypes, Record<string, Set<number>>>
>;

/**
 * Merges a field instance's grouped validation IDs into the shared buckets.
 */
const mergeValidationInput = (
	fieldType: FieldTypes,
	input: FieldRelationValidationInput,
	buckets: ValidationBuckets,
) => {
	const fieldBuckets = buckets[fieldType] ?? {};

	for (const groupKey in input) {
		const groupIds = input[groupKey];
		if (!groupIds) continue;

		const groupBucket = fieldBuckets[groupKey] ?? new Set<number>();
		for (const id of groupIds) {
			groupBucket.add(id);
		}
		fieldBuckets[groupKey] = groupBucket;
	}

	buckets[fieldType] = fieldBuckets;
};

/**
 * Collects grouped validation IDs from a field value and any translations.
 */
const collectFieldValidationInput = (
	field: FieldInputSchema,
	instance: CollectionBuilder | BrickBuilder,
): FieldRelationValidationInput | null => {
	const fieldInstance = getFieldBuilderState(instance).fields.get(field.key);
	if (!fieldInstance) return null;

	const mergedInput: FieldRelationValidationInput = {};

	const pushValue = (value: unknown) => {
		const validationInput =
			fieldInstance.getRelationFieldValidationInput(value);

		for (const groupKey in validationInput) {
			const groupIds = validationInput[groupKey];
			if (!groupIds) continue;

			const currentIds = mergedInput[groupKey] ?? [];
			currentIds.push(...groupIds);
			mergedInput[groupKey] = currentIds;
		}
	};

	if (field.value !== undefined && field.value !== null) {
		pushValue(field.value);
	}

	if (field.translations) {
		for (const localeCode in field.translations) {
			const localeValue = field.translations[localeCode];
			if (localeValue === undefined || localeValue === null) continue;

			pushValue(localeValue);
		}
	}

	return mergedInput;
};

/**
 * Responsible for fetching data used for validating custom field values.
 */
const fetchValidationData: ServiceFn<
	[
		{
			bricks: Array<BrickInputSchema>;
			fields: Array<FieldInputSchema>;
			collection: CollectionBuilder;
			authUser?: LucidUser;
			existingVersion?: { id: number; documentId: number };
		},
	],
	ValidationData
> = async (context, data) => {
	const buckets = extractRelationIds(data.bricks, data.fields, data.collection);
	const validationData = await buildValidationData(context, buckets);

	const richTextValidationData = validationData[
		"rich-text"
	] as RichTextValidationData;
	if (data.existingVersion && buckets["rich-text"]) {
		const DocumentReferences = new DocumentReferencesRepository(context.db);
		const retained = await DocumentReferences.selectMultiple({
			select: ["target_resource", "target_table", "target_id"],
			where: [
				{ key: "collection_key", operator: "=", value: data.collection.key },
				{
					key: "document_id",
					operator: "=",
					value: data.existingVersion.documentId,
				},
				{ key: "version_id", operator: "=", value: data.existingVersion.id },
				{ key: "kind", operator: "=", value: "embedded" },
			],
		});
		if (retained.error) return retained;

		richTextValidationData.retainedReferences = {};
		for (const reference of retained.data ?? []) {
			addRefTarget(richTextValidationData.retainedReferences, {
				resource: reference.target_resource,
				table: reference.target_table,
				value: reference.target_id,
			});
		}
	}
	if (data.authUser) {
		richTextValidationData.variableAccess = resolveRichTextVariableAccess({
			collectionKeys: context.config.collections.map(
				(collection) => collection.key,
			),
			user: data.authUser,
		});
	}
	richTextValidationData.embeddedBricks = Object.fromEntries(
		data.bricks.flatMap((brick) =>
			brick.type === "embedded" ? [[brick.ref, brick.key]] : [],
		),
	);
	richTextValidationData.cyclicEmbeddedBricks = Array.from(
		analyzeEmbeddedBrickGraph(data).cyclic,
	);

	return {
		data: validationData,
		error: undefined,
	};
};

/**
 * Extracts grouped relation IDs from the provided bricks and fields.
 */
const extractRelationIds = (
	bricks: Array<BrickInputSchema>,
	fields: Array<FieldInputSchema>,
	collection: CollectionBuilder,
): ValidationBuckets => {
	const buckets: ValidationBuckets = {};

	for (const brick of bricks) {
		const instance = getBrickInstance(brick, collection);
		if (!instance || !brick.fields) continue;

		extractRelationIdsFromFields(brick.fields, instance, buckets);
	}

	extractRelationIdsFromFields(fields, collection, buckets);
	return buckets;
};

/**
 * Returns the configured brick instance for a submitted brick payload.
 */
const getBrickInstance = (
	brick: BrickInputSchema,
	collection: CollectionBuilder,
): CollectionBuilder | BrickBuilder | undefined => {
	switch (brick.type) {
		case "builder":
			return collection.config.bricks?.builder?.find(
				(b) => b.key === brick.key,
			);
		case "fixed":
			return collection.config.bricks?.fixed?.find((b) => b.key === brick.key);
		case "embedded":
			return collection.config.bricks?.embedded?.find(
				(b) => b.key === brick.key,
			);
		default:
			return undefined;
	}
};

/**
 * Recursively extracts grouped relation IDs from a field tree.
 */
const extractRelationIdsFromFields = (
	fields: Array<FieldInputSchema>,
	instance: CollectionBuilder | BrickBuilder,
	buckets: ValidationBuckets,
) => {
	for (const field of fields) {
		const fieldInstance = getFieldBuilderState(instance).fields.get(field.key);
		if (!fieldInstance) continue;

		const fieldDefinition = registeredFields[fieldInstance.type];
		const databaseConfig = fieldDefinition.config.database;

		if (fieldDefinition.validateInput !== null) {
			const validationInput = collectFieldValidationInput(field, instance);
			if (validationInput) {
				mergeValidationInput(field.type, validationInput, buckets);
			}
		}

		if (isStorageMode(databaseConfig, "tree-table") && field.groups) {
			for (const group of field.groups) {
				extractRelationIdsFromFields(group.fields, instance, buckets);
			}
		}
	}
};

/**
 * Fetches shared validation data for each field type with a validator.
 */
const buildValidationData = async (
	context: ServiceContext,
	buckets: ValidationBuckets,
): Promise<ValidationData> => {
	const validationData: ValidationData = {};
	const promises: Promise<void>[] = [];

	for (const fieldType of registeredFieldTypes) {
		const fieldDefinition = registeredFields[fieldType];
		if (fieldDefinition.validateInput === null) continue;

		const input = Object.entries(
			buckets[fieldType] ?? {},
		).reduce<FieldRelationValidationInput>((acc, [groupKey, ids]) => {
			acc[groupKey] = Array.from(ids);
			return acc;
		}, {});

		promises.push(
			fieldDefinition.validateInput(context, input).then((result) => {
				validationData[fieldType] = result;
			}),
		);
	}

	await Promise.all(promises);
	return validationData;
};

export default fetchValidationData;
