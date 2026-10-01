import { copy } from "../../libs/i18n/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import notifyDependants from "../document-references/notify-dependants.js";
import deleteMediaPermanently from "../media/delete-single-permanently.js";
import ownedProfilePicture from "./helpers/owned-profile-picture.js";

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
	const Users = new UsersRepository(context.db);

	if (data.allowSelf !== true && data.actorUserId === data.targetUserId) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.users.self.update.denied"),
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
						? copy("server:core.account.not.found.message")
						: copy("server:core.user.not.found.message"),
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

	//* a picture moved to the media library is only unlinked
	const ownedRes = await ownedProfilePicture(context, {
		mediaId: userRes.data.profile_picture_media_id,
		userId: data.targetUserId,
	});
	if (ownedRes.error) return ownedRes;

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

	const references = await notifyDependants(context, {
		resource: "users",
		table: "lucid_users",
		ids: [data.targetUserId],
	});
	if (references.error) return references;

	if (ownedRes.data !== null) {
		const deleteMediaRes = await deleteMediaPermanently(context, {
			id: ownedRes.data,
			actor: { type: "internal" },
			userId: data.actorUserId,
		});
		if (deleteMediaRes.error) return deleteMediaRes;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteProfilePicture;
