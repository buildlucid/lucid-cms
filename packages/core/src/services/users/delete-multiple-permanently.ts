import formatter from "../../libs/formatters/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const deleteMultiplePermanently: ServiceFn<
	[
		{
			ids: number[];
			currentUserId: number;
		},
	],
	undefined
> = async (context, data) => {
	if (!data.ids || data.ids.length === 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	if (data.ids.includes(data.currentUserId)) {
		return {
			error: {
				type: "basic",
				message: T("error_cant_delete_yourself"),
				status: 400,
			},
			data: undefined,
		};
	}

	const Users = new UsersRepository(context.db.client, context.config.db);

	const usersRes = await Users.selectMultiple({
		select: ["id", "is_deleted"],
		where: [
			{
				key: "id",
				operator: "in",
				value: data.ids,
			},
		],
		validation: {
			enabled: true,
		},
	});
	if (usersRes.error) return usersRes;

	const existing = new Set(usersRes.data.map((user) => user.id));
	const missing = data.ids.filter((id) => !existing.has(id));
	if (missing.length > 0) {
		return {
			error: {
				type: "basic",
				message: T("user_not_found_message"),
				errors: {
					ids: {
						message: T("only_found_ids_error_message", {
							ids: usersRes.data.map((user) => user.id).join(", "),
						}),
					},
				},
				status: 404,
			},
			data: undefined,
		};
	}

	const activeUserCountRes = await Users.count({
		where: [
			{
				key: "is_deleted",
				operator: "=",
				value: context.config.db.getDefault("boolean", "false"),
			},
		],
	});
	if (activeUserCountRes.error) return activeUserCountRes;

	const activeUserCount = formatter.parseCount(activeUserCountRes.data?.count);
	const activeTargetCount = usersRes.data.filter(
		(user) =>
			user.is_deleted === context.config.db.getDefault("boolean", "false"),
	).length;
	if (activeUserCount - activeTargetCount < 1) {
		return {
			error: {
				type: "basic",
				message: T("error_cant_delete_last_user"),
				status: 400,
			},
			data: undefined,
		};
	}

	const deleteUsersRes = await Users.deleteMultiple({
		where: [
			{
				key: "id",
				operator: "in",
				value: data.ids,
			},
		],
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (deleteUsersRes.error) return deleteUsersRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteMultiplePermanently;
