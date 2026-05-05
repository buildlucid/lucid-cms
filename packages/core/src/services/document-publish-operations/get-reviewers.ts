import { resolveCollectionPermission } from "../../libs/permission/collection-permissions.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { collectionServices } from "../index.js";
import {
	canUsePublishOperationsForTarget,
	hasCollectionTargetPermission,
} from "./helpers/index.js";

const getReviewers: ServiceFn<
	[
		{
			collectionKey: string;
			target: string;
			user?: LucidAuth;
		},
	],
	Array<{
		id: number;
		email: string;
		username: string;
		firstName: string | null;
		lastName: string | null;
	}>
> = async (context, data) => {
	const collectionRes = collectionServices.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	if (
		!canUsePublishOperationsForTarget({
			collection: collectionRes.data,
			target: data.target,
		})
	) {
		return {
			error: {
				type: "basic",
				message: T("collection_permission_error_message", {
					collection: data.collectionKey,
					action: "review",
				}),
				status: 400,
			},
			data: undefined,
		};
	}

	if (
		data.user !== undefined &&
		!hasCollectionTargetPermission({
			user: data.user,
			collection: collectionRes.data,
			action: "publish",
			target: data.target,
		})
	) {
		return {
			error: {
				type: "basic",
				name: T("collection_permission_error_name"),
				message: T("collection_permission_error_message", {
					collection: data.collectionKey,
					action: "publish",
				}),
				status: 403,
			},
			data: undefined,
		};
	}

	const permission = resolveCollectionPermission({
		collection: collectionRes.data,
		action: "review",
		target: data.target,
	});

	const Users = new UsersRepository(context.db.client, context.config.db);
	const reviewersRes = await Users.selectMultiplePublishReviewers({
		permission,
	});
	if (reviewersRes.error) return reviewersRes;

	return {
		error: undefined,
		data: (reviewersRes.data ?? []).map((reviewer) => ({
			id: reviewer.id,
			email: reviewer.email,
			username: reviewer.username,
			firstName: reviewer.firstName,
			lastName: reviewer.lastName,
		})),
	};
};

export default getReviewers;
