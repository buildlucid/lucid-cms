import { UsersRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { UserPropT } from "../../libs/formatters/users.js";

const getMultipleFieldMeta: ServiceFn<
	[
		{
			ids: number[];
		},
	],
	UserPropT[]
> = async (context, data) => {
	const User = new UsersRepository(context.db, context.config.db);

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
			{
				key: "invitation_accepted",
				operator: "=",
				value: context.config.db.getDefault("boolean", "true"),
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

export default getMultipleFieldMeta;
