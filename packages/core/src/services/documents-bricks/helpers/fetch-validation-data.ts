import type BrickBuilder from "../../../libs/collection/builders/brick-builder/index.js";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import type CustomField from "../../../libs/collection/custom-fields/custom-field.js";
import registeredFields, {
	registeredFieldTypes,
} from "../../../libs/collection/custom-fields/registered-fields.js";
import { isStorageMode } from "../../../libs/collection/custom-fields/storage/index.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema, FieldTypes } from "../../../types.js";
import type {
	ServiceContext,
	ServiceFn,
} from "../../../utils/services/types.js";

export type ValidationData = Partial<Record<FieldTypes, unknown>>;
export type FieldValidationInput = {
	ids: number[];
	idsByCollection: Record<string, number[]>;
};

type ValidationBuckets = {
	ids: Partial<Record<FieldTypes, Set<number>>>;
	byCollection: Partial<Record<FieldTypes, Record<string, Set<number>>>>;
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
 * Extract all relation IDs from bricks and fields.
 */
const extractRelationIds = (
	bricks: Array<BrickInputSchema>,
	fields: Array<FieldInputSchema>,
	collection: CollectionBuilder,
): ValidationBuckets => {
	const buckets: ValidationBuckets = {
		ids: {},
		byCollection: {},
	};

	for (const brick of bricks) {
		const instance = getBrickInstance(brick, collection);
		if (!instance || !brick.fields) continue;

		extractRelationIdsFromFields(brick.fields, instance, buckets);
	}

	extractRelationIdsFromFields(fields, collection, buckets);
	return buckets;
};

/**
 * Gets the appropriate brick instance based on brick type.
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
 * Recursively extract relation IDs from fields.
 */
const extractRelationIdsFromFields = (
	fields: Array<FieldInputSchema>,
	instance: CollectionBuilder | BrickBuilder,
	buckets: ValidationBuckets,
) => {
	for (const field of fields) {
		const fieldInstance = instance.fields.get(field.key);
		if (!fieldInstance) continue;
		const databaseConfig = registeredFields[fieldInstance.type].config.database;

		const validationConfig = registeredFields[field.type].config.validation;
		const ids = extractIdsFromField(field);

		if (validationConfig?.mode === "ids") {
			const current = buckets.ids[field.type] ?? new Set<number>();
			for (const id of ids) current.add(id);
			buckets.ids[field.type] = current;
		}

		if (validationConfig?.mode === "document-by-collection") {
			const collectionKey = getDocumentCollectionKey(fieldInstance);
			if (collectionKey) {
				const currentByType = buckets.byCollection[field.type] ?? {};
				const currentByCollection =
					currentByType[collectionKey] ?? new Set<number>();

				for (const id of ids) currentByCollection.add(id);

				currentByType[collectionKey] = currentByCollection;
				buckets.byCollection[field.type] = currentByType;
			}
		}

		if (isStorageMode(databaseConfig, "tree-table") && field.groups) {
			for (const group of field.groups) {
				extractRelationIdsFromFields(group.fields, instance, buckets);
			}
		}
	}
};

const getDocumentCollectionKey = (
	fieldInstance: CustomField<FieldTypes>,
): string | null => {
	if (
		"collection" in fieldInstance.config &&
		typeof fieldInstance.config.collection === "string"
	) {
		return fieldInstance.config.collection;
	}

	return null;
};

/**
 * Extract IDs from a field (both direct value and translations).
 */
const extractIdsFromField = (field: FieldInputSchema): number[] => {
	const ids: number[] = [];

	if (field.value !== undefined && field.value !== null) {
		const id = Number(field.value);
		if (!Number.isNaN(id)) ids.push(id);
	}

	if (field.translations) {
		for (const localeCode in field.translations) {
			const value = field.translations[localeCode];
			if (value === undefined || value === null) continue;

			const id = Number(value);
			if (!Number.isNaN(id)) ids.push(id);
		}
	}

	return ids;
};

const hasValidator = (
	field: (typeof registeredFields)[FieldTypes],
): field is
	| (typeof registeredFields)["media"]
	| (typeof registeredFields)["user"]
	| (typeof registeredFields)["document"] => {
	return field.config.validation !== null && field.validateInput !== null;
};

const buildValidationData = async (
	context: ServiceContext,
	buckets: ValidationBuckets,
): Promise<ValidationData> => {
	const validationData: ValidationData = {};
	const promises: Promise<void>[] = [];

	for (const fieldType of registeredFieldTypes) {
		const fieldDefinition = registeredFields[fieldType];
		if (!hasValidator(fieldDefinition)) continue;

		const byCollection = buckets.byCollection[fieldType] ?? {};
		const idsByCollection: Record<string, number[]> = {};

		for (const collectionKey in byCollection) {
			idsByCollection[collectionKey] = Array.from(
				byCollection[collectionKey] ?? new Set<number>(),
			);
		}

		const input: FieldValidationInput = {
			ids: Array.from(buckets.ids[fieldType] ?? new Set<number>()),
			idsByCollection,
		};

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
