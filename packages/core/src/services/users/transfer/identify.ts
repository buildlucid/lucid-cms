import { UsersRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Returns user IDs as their own identities. Users belong to their site, so links to them only carry over on it. */
const identifyUsers: ServiceFn<
	[{ ids: string[] }],
	Map<string, string>
> = async (context, data) => {
	const ids = data.ids.map(Number).filter(Number.isInteger);
	if (ids.length === 0) return { error: undefined, data: new Map() };

	const Users = new UsersRepository(context.db);
	const usersRes = await Users.selectMultiple({
		select: ["id"],
		where: [{ key: "id", operator: "in", value: ids }],
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

export default identifyUsers;
