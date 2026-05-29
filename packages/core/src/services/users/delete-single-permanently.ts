import { text } from "../../libs/i18n/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
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
				message: text.server("core.users.self.delete.denied"),
				status: 400,
			},
			data: undefined,
		};
	}

	await userServices.checks.checkNotLastUser(context);

	const getUserRes = await Users.selectSingle({
		select: ["id"],
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
				message: text.server("core.user.not.found.message"),
				status: 404,
			},
		},
	});
	if (getUserRes.error) return getUserRes;

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

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSinglePermanently;
