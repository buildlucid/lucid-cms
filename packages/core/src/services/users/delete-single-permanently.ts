import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { invalidateAuthCache } from "../auth/helpers/auth-cache.js";
import { userServices } from "../index.js";

const deleteSinglePermanently: ServiceFn<
	[
		{
			userId: number;
			currentUserId: number;
		},
	],
	undefined
> = async (context, data) => {
	const Users = new UsersRepository(context.db.client, context.config.db);

	if (data.currentUserId === data.userId) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.users.self.delete.denied"),
				status: 400,
			},
			data: undefined,
		};
	}

	const accessRes = await userServices.checks.checkUserAccess(context, {
		id: data.userId,
	});
	if (accessRes.error) return accessRes;

	const getUserRes = await Users.selectSingle({
		select: ["id", "is_deleted"],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.userId,
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.user.not.found.message"),
				status: 404,
			},
		},
	});
	if (getUserRes.error) return getUserRes;

	if (!formatter.formatBoolean(getUserRes.data.is_deleted)) {
		const notLastUserRes = await userServices.checks.checkNotLastUser(context);
		if (notLastUserRes.error) return notLastUserRes;
	}

	const deleteUserRes = await Users.deleteSingle({
		where: [
			{
				key: "id",
				operator: "=",
				value: data.userId,
			},
		],
		returning: ["id"],
		validation: {
			enabled: true,
			defaultError: {
				status: 500,
			},
		},
	});
	if (deleteUserRes.error) return deleteUserRes;

	await invalidateAuthCache(context);

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSinglePermanently;
