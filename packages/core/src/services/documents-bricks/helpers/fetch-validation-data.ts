import type BrickBuilder from "../../../libs/collection/builders/brick-builder/index.js";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import registeredFields, {
	registeredFieldTypes,
} from "../../../libs/collection/custom-fields/registered-fields.js";
import { isStorageMode } from "../../../libs/collection/custom-fields/storage/index.js";
import type {
	FieldRelationValidationInput,
	FieldTypes,
} from "../../../libs/collection/custom-fields/types.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../types.js";
import type {
	ServiceContext,
	ServiceFn,
} from "../../../utils/services/types.js";

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
	const fieldInstance = instance.fields.get(field.key);
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
		},
	],
	ValidationData
> = async (context, data) => {
	const buckets = extractRelationIds(data.bricks, data.fields, data.collection);
	const validationData = await buildValidationData(context, buckets);

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
		const fieldInstance = instance.fields.get(field.key);
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
