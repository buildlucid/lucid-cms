import type { ServiceFn } from "../../../../../utils/services/types.js";
import type { UserPropT } from "../../../../formatters/users.js";
import { UsersRepository } from "../../../../repositories/index.js";

const fetchUserRefs: ServiceFn<
	[
		{
			ids: number[];
		},
	],
	UserPropT[]
> = async (context, data) => {
	const User = new UsersRepository(context.db.client, context.config.db);

	if (data.ids.length === 0) {
		return {
			data: [],
			error: undefined,
		};
	}

	const userRes = await User.selectMultipleByIds({
		ids: data.ids,
		where: [
			{
				key: "is_deleted",
				operator: "=",
				value: context.config.db.getDefault("boolean", "false"),
			},
		],
		validation: {
			enabled: true,
		},
	});
	if (userRes.error) return userRes;

	return {
		error: undefined,
		data: userRes.data,
	};
};

export default fetchUserRefs;
