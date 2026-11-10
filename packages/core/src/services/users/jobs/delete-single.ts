import z from "zod";
import formatter from "../../../libs/formatters/index.js";
import defineJob from "../../../libs/jobs/define-job.js";
import type { JobService } from "../../../libs/jobs/types.js";
import systemActor from "../../../libs/permission/system-actor.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import { LucidError } from "../../../utils/errors/index.js";
import { invalidateAuthCache } from "../../auth/helpers/auth-cache.js";
import removeTarget from "../../document-references/remove-target.js";
import checkNotLastUser from "../checks/check-not-last-user.js";
import checkUserAccess from "../checks/check-user-access.js";
import deleteOwnedMedia from "../helpers/delete-owned-media.js";

const input = z.object({ id: z.number().int().positive() });

const deleteUser: JobService<z.infer<typeof input>> = async ({
	context,
	input,
}) => {
	const User = new UsersRepository(context.db);

	const accessRes = await checkUserAccess(context, {
		auth: systemActor,
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

	const ownedMediaRes = await deleteOwnedMedia(context, {
		userIds: [input.id],
		actorUserId: null,
	});
	if (ownedMediaRes.error) return ownedMediaRes;

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

export const deleteUserJob = defineJob({
	key: "core:delete-user",
	version: 1,
	input,
	handler: async (args) => {
		const result = await deleteUser(args);
		if (result.error) throw new LucidError(result.error);
	},
	describe: ({ input: { id } }) => ({ userId: id }),
});
