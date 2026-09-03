import { enqueueJobs } from "../../../libs/jobs/enqueue.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import { getRetentionDays } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { deleteUserJob } from "../../users/jobs/delete-single.js";

/** Queues expired soft-deleted users for permanent deletion. */
const deleteExpiredDeletedUsers: ServiceFn<[], undefined> = async (context) => {
	const Users = new UsersRepository(context.db);

	const compDate = getRetentionDays(context.config.retention, "deletedUsers");

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

	const queueRes = await enqueueJobs(context, {
		job: deleteUserJob,
		payload: softDeletedUsersRes.data.map((user) => ({
			id: user.id,
		})),
	});
	if (queueRes.error) return queueRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteExpiredDeletedUsers;
