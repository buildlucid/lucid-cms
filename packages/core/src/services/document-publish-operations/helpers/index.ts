import constants from "../../../constants/constants.js";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import { resolveCollectionPermission } from "../../../libs/permission/collection-permissions.js";
import hasAccess from "../../../libs/permission/has-access.js";
import type { LucidAuth } from "../../../types/hono.js";

export const activePublishOperationStatuses = ["pending"] as const;
export const snapshotVersionType =
	constants.collectionBuilder.publishRequests.snapshotVersionType;

export const getPublishOperationTargets = (collection: CollectionBuilder) => {
	const config = collection.getData.config.publishRequests;
	if (!config.enabled) return [];

	if (config.targets === undefined) return [];

	const environmentKeys = collection.getData.config.environments.map(
		(environment) => environment.key,
	);
	return config.targets.filter((target) => environmentKeys.includes(target));
};

export const canUsePublishOperationsForTarget = (params: {
	collection: CollectionBuilder;
	target: string;
}) => getPublishOperationTargets(params.collection).includes(params.target);

export const hasCollectionTargetPermission = (params: {
	user: LucidAuth;
	collection: CollectionBuilder;
	action: "publish" | "review";
	target: string;
}) => {
	const permission = resolveCollectionPermission({
		collection: params.collection,
		action: params.action,
		target: params.target,
	});

	return hasAccess({
		user: params.user,
		requiredPermissions: [permission],
	});
};
