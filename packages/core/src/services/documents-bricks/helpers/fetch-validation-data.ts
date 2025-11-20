import T from "../../../translations/index.js";
import constants from "../../../constants/constants.js";
import {
	MediaRepository,
	UsersRepository,
	DocumentsRepository,
} from "../../../libs/repositories/index.js";
import logger from "../../../libs/logger/index.js";
import buildTableName from "../../../libs/collection/helpers/build-table-name.js";
import type BrickBuilder from "../../../libs/builders/brick-builder/index.js";
import type CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import type {
	ServiceContext,
	ServiceFn,
} from "../../../utils/services/types.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type {
	FieldInputSchema,
	LucidDocumentTableName,
} from "../../../types.js";
import type {
	UserReferenceData,
	MediaReferenceData,
	DocumentReferenceData,
} from "../../../libs/custom-fields/types.js";
import type CustomField from "../../../libs/custom-fields/custom-field.js";

export interface ValidationData {
	media: MediaReferenceData[];
	users: UserReferenceData[];
	documents: DocumentReferenceData[];
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
		fetchMediaData(context, mediaIds),
		fetchUserData(context, userIds),
		fetchDocumentData(context, documentIdsByCollection),
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

/**
 * Fetch media data
 */
const fetchMediaData = async (
	context: ServiceContext,
	mediaIds: number[],
): Promise<MediaReferenceData[]> => {
	if (mediaIds.length === 0) return [];

	try {
		const Media = new MediaRepository(context.db, context.config.db);

		const mediaRes = await Media.selectMultiple({
			select: ["id", "file_extension", "width", "height", "type"],
			where: [
				{
					key: "id",
					operator: "in",
					value: mediaIds,
				},
			],
			validation: {
				enabled: true,
			},
		});

		return mediaRes.error ? [] : mediaRes.data;
	} catch (err) {
		logger.error({
			scope: constants.logScopes.validation,
			message: T("error_fetching_media_for_validation"),
		});
		return [];
	}
};

/**
 * Fetch user data
 */
const fetchUserData = async (
	context: ServiceContext,
	userIds: number[],
): Promise<UserReferenceData[]> => {
	if (userIds.length === 0) return [];

	try {
		const Users = new UsersRepository(context.db, context.config.db);

		const usersRes = await Users.selectMultiple({
			select: ["id"],
			where: [
				{
					key: "id",
					operator: "in",
					value: userIds,
				},
			],
			validation: {
				enabled: true,
			},
		});

		return usersRes.error ? [] : usersRes.data;
	} catch (err) {
		logger.error({
			scope: constants.logScopes.validation,
			message: T("error_fetching_users_for_validation"),
		});
		return [];
	}
};

/**
 * Fetch document data from multiple collections
 */
const fetchDocumentData = async (
	context: ServiceContext,
	documentIdsByCollection: Record<string, number[]>,
): Promise<DocumentReferenceData[]> => {
	const allDocuments: DocumentReferenceData[] = [];
	try {
		//* create queries for each collection key
		const promises = Object.entries(documentIdsByCollection).map(
			([collectionKey, ids]) => {
				if (ids.length === 0) return Promise.resolve([]);

				const uniqueIds = [...new Set(ids)];
				return fetchDocumentsFromCollection(context, collectionKey, uniqueIds);
			},
		);

		const results = await Promise.all(promises);
		for (const documents of results) allDocuments.push(...documents);
		return allDocuments;
	} catch (err) {
		logger.error({
			scope: constants.logScopes.validation,
			message: T("error_fetching_documents_for_validation"),
		});
		return [];
	}
};

/**
 * Fetch documents from a specific collection
 */
const fetchDocumentsFromCollection = async (
	context: ServiceContext,
	collectionKey: string,
	ids: number[],
): Promise<DocumentReferenceData[]> => {
	if (ids.length === 0) return [];

	try {
		const tableNameRes = buildTableName<LucidDocumentTableName>("document", {
			collection: collectionKey,
		});
		if (tableNameRes.error) {
			logger.error({
				scope: constants.logScopes.validation,
				message: T("error_fetching_documents_from_collection", {
					collection: collectionKey,
				}),
			});
			return [];
		}

		const Document = new DocumentsRepository(context.db, context.config.db);

		const documentIdRes = await Document.selectMultiple(
			{
				select: ["id"],
				where: [
					{
						key: "id",
						operator: "in",
						value: ids,
					},
				],
				validation: {
					enabled: true,
				},
			},
			{
				tableName: tableNameRes.data,
			},
		);
		if (documentIdRes.error) {
			logger.error({
				scope: constants.logScopes.validation,
				message: T("error_fetching_documents_from_collection", {
					collection: collectionKey,
				}),
			});
			return [];
		}

		return documentIdRes.data.map((doc) => ({
			id: doc.id,
			collection_key: collectionKey,
		}));
	} catch (err) {
		logger.error({
			scope: constants.logScopes.validation,
			message: T("error_fetching_documents_from_collection", {
				collection: collectionKey,
			}),
		});
		return [];
	}
};

export default fetchValidationData;
