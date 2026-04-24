import { UsersRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices } from "../index.js";

const deleteProfilePicture: ServiceFn<
	[
		{
			targetUserId: number;
			actorUserId: number;
			allowSelf?: boolean;
		},
	],
	undefined
> = async (context, data) => {
	const Users = new UsersRepository(context.db.client, context.config.db);

	if (data.allowSelf !== true && data.actorUserId === data.targetUserId) {
		return {
			error: {
				type: "basic",
				message: T("error_cant_update_yourself"),
				status: 400,
			},
			data: undefined,
		};
	}

	const userRes = await Users.selectSingle({
		select: ["profile_picture_media_id"],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.targetUserId,
			},
			{
				key: "is_deleted",
				operator: "=",
				value: context.config.db.getDefault("boolean", "false"),
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				message:
					data.allowSelf === true
						? T("account_not_found_message")
						: T("user_not_found_message"),
				status: 404,
			},
		},
	});
	if (userRes.error) return userRes;

	if (userRes.data.profile_picture_media_id === null) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const updateUserRes = await Users.updateSingle({
		data: {
			profile_picture_media_id: null,
			updated_at: new Date().toISOString(),
		},
		where: [
			{
				key: "id",
				operator: "=",
				value: data.targetUserId,
			},
		],
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (updateUserRes.error) return updateUserRes;

	const deleteMediaRes = await mediaServices.deleteSinglePermanently(context, {
		id: userRes.data.profile_picture_media_id,
		userId: data.actorUserId,
	});
	if (deleteMediaRes.error) return deleteMediaRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteProfilePicture;
