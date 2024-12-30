import constants from "../../constants/constants.js";
import Repository from "../../libs/repositories/index.js";
import logger from "../../utils/logging/index.js";
import { boolean } from "../../utils/helpers/index.js";
import type { ServiceContext, ServiceFn } from "../../utils/services/types.js";

/**
 * Responsible for syncing active collections to the DB.
 * - In the case a collection exists in the DB, but not in the config: it is marked as deleted.
 */
const syncCollections: ServiceFn<[], undefined> = async (
	context: ServiceContext,
) => {
	const CollectionsRepo = Repository.get(
		"collections",
		context.db,
		context.config.db,
	);
	const activeCollections = context.config.collections.map((c) => c.key);

	const collections = await CollectionsRepo.selectAll({
		select: ["key", "is_deleted"],
	});
	const collectionsFromDB = collections.map((collection) => collection.key);

	//* new collections
	const missingCollections = activeCollections.filter(
		(key) => !collectionsFromDB.includes(key),
	);
	if (missingCollections.length > 0) {
		logger("debug", {
			message: `Syncing new collections to the DB: ${missingCollections.join(", ")}`,
			scope: constants.logScopes.sync,
		});
	}

	//* deleted collections
	const collectionsToDelete = collections.filter(
		(collection) =>
			!activeCollections.includes(collection.key) &&
			boolean.responseFormat(collection.is_deleted) === false,
	);
	const collectionsToDeleteKeys = collectionsToDelete.map(
		(collection) => collection.key,
	);
	if (collectionsToDeleteKeys.length > 0) {
		logger("debug", {
			message: `Marking the following collections as deleted: ${collectionsToDeleteKeys.join(", ")}`,
			scope: constants.logScopes.sync,
		});
	}

	//* previously deleted, now active
	const unDeletedCollections = collections.filter(
		(collection) =>
			boolean.responseFormat(collection.is_deleted) &&
			activeCollections.includes(collection.key),
	);
	const unDeletedCollectionKeys = unDeletedCollections.map(
		(collection) => collection.key,
	);
	if (unDeletedCollectionKeys.length > 0) {
		logger("debug", {
			message: `Restoring previously deleted collections: ${unDeletedCollectionKeys.join(", ")}`,
			scope: constants.logScopes.sync,
		});
	}

	await Promise.all([
		missingCollections.length > 0 &&
			CollectionsRepo.createMultiple({
				items: missingCollections.map((key) => ({ key })),
			}),
		collectionsToDeleteKeys.length > 0 &&
			CollectionsRepo.updateSingle({
				data: {
					isDeleted: true,
					isDeletedAt: new Date().toISOString(),
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
			CollectionsRepo.updateSingle({
				data: {
					isDeleted: false,
					isDeletedAt: null,
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

	return {
		error: undefined,
		data: undefined,
	};
};

export default syncCollections;
