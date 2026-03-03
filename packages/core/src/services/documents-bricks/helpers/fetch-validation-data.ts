import type BrickBuilder from "../../../libs/collection/builders/brick-builder/index.js";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import type CustomField from "../../../libs/collection/custom-fields/custom-field.js";
import type { DocumentValidationData } from "../../../libs/collection/custom-fields/fields/document/types.js";
import type { MediaValidationData } from "../../../libs/collection/custom-fields/fields/media/types.js";
import type { UserValidationData } from "../../../libs/collection/custom-fields/fields/user/types.js";
import registeredFields from "../../../libs/collection/custom-fields/registered-fields.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../types.js";
import type { ServiceFn } from "../../../utils/services/types.js";

export interface ValidationData {
	media: MediaValidationData[];
	users: UserValidationData[];
	documents: DocumentValidationData[];
}

/**
 * Responsible for fetching data used for validating custom field values.
 *
 * @todo For custom custom field support down the line - validation data fetch logic should be moved to custom field instances. Active custom fields would need to be registered in config.
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
	const { mediaIds, userIds, documentIdsByCollection } = extractRelationIds(
		data.bricks,
		data.fields,
		data.collection,
	);

	const [media, users, documents] = await Promise.all([
		registeredFields.media.validateInput(context, mediaIds),
		registeredFields.user.validateInput(context, userIds),
		registeredFields.document.validateInput(context, documentIdsByCollection),
	]);

	return {
		data: {
			media,
			users,
			documents,
		},
		error: undefined,
	};
};

/**
 * Extract all relation IDs from bricks and fields
 */
const extractRelationIds = (
	bricks: Array<BrickInputSchema>,
	fields: Array<FieldInputSchema>,
	collection: CollectionBuilder,
) => {
	const mediaIds: number[] = [];
	const userIds: number[] = [];
	const documentIdsByCollection: Record<string, number[]> = {};

	for (const brick of bricks) {
		const instance = getBrickInstance(brick, collection);
		if (!instance) continue;

		if (brick.fields) {
			extractRelationIdsFromFields(
				brick.fields,
				instance,
				mediaIds,
				userIds,
				documentIdsByCollection,
			);
		}
	}

	extractRelationIdsFromFields(
		fields,
		collection,
		mediaIds,
		userIds,
		documentIdsByCollection,
	);

	return {
		mediaIds: [...new Set(mediaIds)],
		userIds: [...new Set(userIds)],
		documentIdsByCollection,
	};
};

/**
 * Gets the appropriate brick instance based on brick type
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
 * Recursively extract relation IDs from fields
 */
const extractRelationIdsFromFields = (
	fields: Array<FieldInputSchema>,
	instance: CollectionBuilder | BrickBuilder,
	mediaIds: number[],
	userIds: number[],
	documentIdsByCollection: Record<string, number[]>,
) => {
	for (const field of fields) {
		const fieldInstance = instance.fields.get(field.key);
		if (!fieldInstance) continue;

		if (field.type === "media") {
			extractIdsFromField(field, mediaIds);
		} else if (field.type === "user") {
			extractIdsFromField(field, userIds);
		} else if (field.type === "document") {
			extractDocumentIds(
				field,
				fieldInstance as CustomField<"document">,
				documentIdsByCollection,
			);
		}

		//* recursively process repeater fields
		if (field.type === "repeater" && field.groups) {
			for (const group of field.groups) {
				extractRelationIdsFromFields(
					group.fields,
					instance,
					mediaIds,
					userIds,
					documentIdsByCollection,
				);
			}
		}
	}
};

/**
 * Extract IDs from a field (general purpose)
 */
const extractIdsFromField = (field: FieldInputSchema, idsList: number[]) => {
	//* check direct value
	if (field.value !== undefined && field.value !== null) {
		const id = Number(field.value);
		if (!Number.isNaN(id)) idsList.push(id);
	}

	//* check translations
	if (field.translations) {
		for (const localeCode in field.translations) {
			const value = field.translations[localeCode];
			if (value !== undefined && value !== null) {
				const id = Number(value);
				if (!Number.isNaN(id)) idsList.push(id);
			}
		}
	}
};

/**
 * Extract document IDs and group them by collection key
 */
const extractDocumentIds = (
	field: FieldInputSchema,
	fieldInstance: CustomField<"document">,
	documentIdsByCollection: Record<string, number[]>,
) => {
	const collectionKey = fieldInstance.config.collection;

	if (!documentIdsByCollection[collectionKey]) {
		documentIdsByCollection[collectionKey] = [];
	}

	//* extract IDs from direct value
	if (field.value !== undefined && field.value !== null) {
		const id = Number(field.value);
		if (!Number.isNaN(id)) {
			documentIdsByCollection[collectionKey].push(id);
		}
	}

	//* extract IDs from translations
	if (field.translations) {
		for (const localeCode in field.translations) {
			const value = field.translations[localeCode];
			if (value !== undefined && value !== null) {
				const id = Number(value);
				if (!Number.isNaN(id)) {
					documentIdsByCollection[collectionKey].push(id);
				}
			}
		}
	}
};

export default fetchValidationData;
