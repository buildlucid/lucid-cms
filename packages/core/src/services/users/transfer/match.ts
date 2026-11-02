import { UsersRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Returns active users that still exist, only for files exported from this site. Other sites leave the links empty. */
const matchUsers: ServiceFn<
	[{ uids: string[]; sameSite: boolean }],
	Map<string, string>
> = async (context, data) => {
	const ids = data.uids.map(Number).filter(Number.isInteger);
	if (!data.sameSite || ids.length === 0) {
		return { error: undefined, data: new Map() };
	}

	const Users = new UsersRepository(context.db);
	const usersRes = await Users.selectMultiple({
		select: ["id"],
		where: [
			{ key: "id", operator: "in", value: ids },
			{ key: "is_deleted", operator: "=", value: false },
		],
		validation: { enabled: true },
	});
	if (usersRes.error) return usersRes;

	return {
		error: undefined,
		data: new Map(
			usersRes.data.map((user) => [String(user.id), String(user.id)]),
		),
	};
};

export default matchUsers;
