import { UsersRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices } from "../index.js";

const updateProfilePicture: ServiceFn<
	[
		{
			targetUserId: number;
			actorUserId: number;
			allowSelf?: boolean;
			key?: string;
			fileName?: string;
			width?: number;
			height?: number;
			focalPoint?: {
				x: number;
				y: number;
			} | null;
			blurHash?: string;
			averageColor?: string;
			base64?: string | null;
			isDark?: boolean;
			isLight?: boolean;
			title?: {
				localeCode: string;
				value: string | null;
			}[];
			alt?: {
				localeCode: string;
				value: string | null;
			}[];
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

	const existingProfilePictureId = userRes.data.profile_picture_media_id;
	if (existingProfilePictureId !== null) {
		const updateMediaRes = await mediaServices.updateSingle(context, {
			id: existingProfilePictureId,
			key: data.key,
			fileName: data.fileName,
			public: true,
			folderId: null,
			title: data.title,
			alt: data.alt,
			width: data.width,
			height: data.height,
			focalPoint: data.focalPoint,
			blurHash: data.blurHash,
			averageColor: data.averageColor,
			base64: data.base64,
			isDark: data.isDark,
			isLight: data.isLight,
			allowedType: "image",
			userId: data.actorUserId,
		});
		if (updateMediaRes.error) return updateMediaRes;

		const updateUserRes = await Users.updateSingle({
			data: {
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

		return {
			error: undefined,
			data: undefined,
		};
	}

	if (data.key === undefined || data.fileName === undefined) {
		return {
			error: {
				type: "basic",
				status: 400,
				errors: {
					profilePicture: {
						code: "media_error",
						message: T("profile_picture_required"),
					},
				},
			},
			data: undefined,
		};
	}

	const createMediaRes = await mediaServices.createSingle(context, {
		key: data.key,
		fileName: data.fileName,
		width: data.width,
		height: data.height,
		focalPoint: data.focalPoint ?? undefined,
		blurHash: data.blurHash,
		averageColor: data.averageColor,
		base64: data.base64,
		isDark: data.isDark,
		isLight: data.isLight,
		title: data.title || [],
		alt: data.alt || [],
		folderId: null,
		isHidden: true,
		allowedType: "image",
		userId: data.actorUserId,
	});
	if (createMediaRes.error) return createMediaRes;

	const updateUserRes = await Users.updateSingle({
		data: {
			profile_picture_media_id: createMediaRes.data.id,
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

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateProfilePicture;
