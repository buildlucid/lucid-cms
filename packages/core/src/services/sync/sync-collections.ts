import constants from "../../constants/constants.js";
import { CollectionsRepository } from "../../libs/repositories/index.js";
import formatter from "../../libs/formatters/index.js";
import logger from "../../libs/logger/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Responsible for syncing active collections to the DB.
 * - In the case a collection exists in the DB, but not in the config: it is marked as deleted.
 */

const syncCollections: ServiceFn<[], undefined> = async (context) => {
	const Collections = new CollectionsRepository(context.db, context.config.db);
	const activeCollections = context.config.collections.map((c) => c.key);

	const collectionsRes = await Collections.selectMultiple({
		select: ["key", "is_deleted"],
		validation: {
			enabled: true,
		},
	});
	if (collectionsRes.error) return collectionsRes;
	const collectionsFromDB = collectionsRes.data.map(
		(collection) => collection.key,
	);

	//* new collections
	const missingCollections = activeCollections.filter(
		(key) => !collectionsFromDB.includes(key),
	);
	if (missingCollections.length > 0) {
		logger.debug({
			message: `Syncing new collections to the DB: ${missingCollections.join(", ")}`,
			scope: constants.logScopes.sync,
		});
	}

	//* deleted collections
	const collectionsToDelete = collectionsRes.data.filter(
		(collection) =>
			!activeCollections.includes(collection.key) &&
			formatter.formatBoolean(collection.is_deleted) === false,
	);
	const collectionsToDeleteKeys = collectionsToDelete.map(
		(collection) => collection.key,
	);
	if (collectionsToDeleteKeys.length > 0) {
		logger.debug({
			message: `Marking the following collections as deleted: ${collectionsToDeleteKeys.join(", ")}`,
			scope: constants.logScopes.sync,
		});
	}

	//* previously deleted, now active
	const unDeletedCollections = collectionsRes.data.filter(
		(collection) =>
			formatter.formatBoolean(collection.is_deleted) &&
			activeCollections.includes(collection.key),
	);
	const unDeletedCollectionKeys = unDeletedCollections.map(
		(collection) => collection.key,
	);
	if (unDeletedCollectionKeys.length > 0) {
		logger.debug({
			message: `Restoring previously deleted collections: ${unDeletedCollectionKeys.join(", ")}`,
			scope: constants.logScopes.sync,
		});
	}

	const [createMultipleRes, updateDeletedRes, updateRestoredRes] =
		await Promise.all([
			missingCollections.length > 0 &&
				Collections.createMultiple({
					data: missingCollections
						.map((key) => {
							return {
								key,
							};
						})
						.filter((c) => c !== null),
				}),
			collectionsToDeleteKeys.length > 0 &&
				Collections.updateSingle({
					data: {
						is_deleted: true,
						is_deleted_at: new Date().toISOString(),
					},
					where: [
						{
							key: "key",
							operator: "in",
							value: collectionsToDeleteKeys,
						},
					],
				}),
			unDeletedCollectionKeys.length > 0 &&
				Collections.updateSingle({
					data: {
						is_deleted: false,
						is_deleted_at: null,
					},
					where: [
						{
							key: "key",
							operator: "in",
							value: unDeletedCollectionKeys,
						},
					],
				}),
		]);
	if (typeof createMultipleRes !== "boolean" && createMultipleRes.error)
		return createMultipleRes;
	if (typeof updateDeletedRes !== "boolean" && updateDeletedRes.error)
		return updateDeletedRes;
	if (typeof updateRestoredRes !== "boolean" && updateRestoredRes.error)
		return updateRestoredRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default syncCollections;
