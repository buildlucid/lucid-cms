import Repository from "../../libs/repositories/index.js";
import { subDays } from "date-fns";
import type { ServiceFn } from "../../utils/services/types.js";
import type { id } from "zod/v4/locales";

/**
 * Finds all soft-deleted users older than 30 days and queues them for permanent deletion
 */
const deleteExpiredDeletedUsers: ServiceFn<[], undefined> = async (context) => {
	const Users = Repository.get("users", context.db, context.config.db);

	// TODO: make this configurable
	const thirtyDaysAgo = subDays(new Date(), 30);

	const softDeletedUsersRes = await Users.selectMultiple({
		select: ["id"],
		where: [
			{
				key: "is_deleted",
				operator: "=",
				value: true,
			},
			{
				key: "is_deleted_at",
				operator: "<",
				value: thirtyDaysAgo.toISOString(),
			},
		],
		validation: {
			enabled: true,
		},
	});
	if (softDeletedUsersRes.error) return softDeletedUsersRes;

	if (softDeletedUsersRes.data.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const queueRes = await context.queue.addBatch("users:delete", {
		payloads: softDeletedUsersRes.data.map((u) => ({
			id: u.id,
		})),
		serviceContext: context,
	});
	if (queueRes.error) return queueRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteExpiredDeletedUsers;
