import z from "zod";
import formatter from "../../../libs/formatters/index.js";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobHandler } from "../../../libs/jobs/types.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import { invalidateAuthCache } from "../../auth/helpers/auth-cache.js";
import removeTarget from "../../document-references/remove-target.js";
import checkNotLastUser from "../checks/check-not-last-user.js";
import checkUserAccess from "../checks/check-user-access.js";

const input = z.object({ id: z.number().int().positive() });

const deleteUser: JobHandler<z.infer<typeof input>> = async ({
	context,
	input,
}) => {
	const User = new UsersRepository(context.db);

	const accessRes = await checkUserAccess(context, {
		id: input.id,
	});
	if (accessRes.error) return accessRes;

	const userRes = await User.selectSingle({
		select: ["id", "is_deleted"],
		where: [
			{
				key: "id",
				operator: "=",
				value: input.id,
			},
		],
		validation: {
			enabled: true,
		},
	});
	if (userRes.error) return userRes;

	if (!formatter.formatBoolean(userRes.data.is_deleted)) {
		const notLastUserRes = await checkNotLastUser(context);
		if (notLastUserRes.error) return notLastUserRes;
	}

	const deleteRes = await User.deleteSingle({
		where: [
			{
				key: "id",
				operator: "=",
				value: input.id,
			},
		],
	});
	if (deleteRes.error) return deleteRes;

	const removedReferences = await removeTarget(context, {
		resource: "users",
		table: "lucid_users",
		ids: [input.id],
	});
	if (removedReferences.error) return removedReferences;

	await invalidateAuthCache(context);

	return {
		error: undefined,
		data: undefined,
	};
};

/**
 * Deletes a single user
 */
export const deleteUserJob = defineJob({
	name: "core:delete-user",
	version: 1,
	input,
	handler: deleteUser,
	describe: ({ input: { id } }) => ({ userId: id }),
});
