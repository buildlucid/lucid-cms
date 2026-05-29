import { mediaFormatter } from "../../libs/formatters/index.js";
import { text } from "../../libs/i18n/index.js";
import { resolveCollectionPermission } from "../../libs/permission/collection-permissions.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { LucidAuth } from "../../types/hono.js";
import { getBaseUrl } from "../../utils/helpers/index.js";
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
		profilePicture: ReturnType<typeof mediaFormatter.formatEmbed>;
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
				message: text.server("core.collections.permission.error.message", {
					data: {
						collection: data.collectionKey,
						action: "review",
					},
				}),
				status: 400,
			},
			data: undefined,
		};
	}

	const canPublish =
		data.user === undefined ||
		hasCollectionTargetPermission({
			user: data.user,
			collection: collectionRes.data,
			action: "publish",
			target: data.target,
		});
	const canReview =
		data.user === undefined ||
		hasCollectionTargetPermission({
			user: data.user,
			collection: collectionRes.data,
			action: "review",
			target: data.target,
		});
	if (data.user !== undefined && !canPublish && !canReview) {
		return {
			error: {
				type: "basic",
				name: text.server("core.collections.permission.error.name"),
				message: text.server("core.collections.permission.error.message", {
					data: {
						collection: data.collectionKey,
						action: "review",
					},
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
			profilePicture: mediaFormatter.formatEmbed({
				poster: reviewer.profile_picture?.[0],
				host: getBaseUrl(context),
			}),
		})),
	};
};

export default getReviewers;
