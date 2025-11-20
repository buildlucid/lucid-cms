import { UsersRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getRetentionDays from "./helpers/get-retention-days.js";

/**
 * Finds all soft-deleted users older than 30 days and queues them for permanent deletion
 */
const deleteExpiredDeletedUsers: ServiceFn<[], undefined> = async (context) => {
	const Users = new UsersRepository(context.db, context.config.db);

	const compDate = getRetentionDays(context.config.softDelete, "users");

	const softDeletedUsersRes = await Users.selectMultiple({
		select: ["id"],
		where: [
			{
				key: "is_deleted",
				operator: "=",
				value: context.config.db.getDefault("boolean", "true"),
			},
			{
				key: "is_deleted_at",
				operator: "<",
				value: compDate,
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

	const queueRes = await context.queue.command.addBatch("users:delete", {
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
