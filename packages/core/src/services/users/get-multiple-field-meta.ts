import Repository from "../../libs/repositories/index.js";
import Formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { CFResponse } from "../../types.js";

const getMultipleFieldMeta: ServiceFn<
	[
		{
			ids: number[];
		},
	],
	CFResponse<"user">["meta"][]
> = async (context, data) => {
	const User = Repository.get("users", context.db, context.config.db);
	const UsersFormatter = Formatter.get("users");

	if (data.ids.length === 0) {
		return {
			data: [],
			error: undefined,
		};
	}

	const userRes = await User.selectMultipleByIds({
		ids: data.ids,
		validation: {
			enabled: true,
		},
	});
	if (userRes.error) return userRes;

	return {
		error: undefined,
		data: UsersFormatter.formatMultiple({
			users: userRes.data,
		}),
	};
};

export default getMultipleFieldMeta;
