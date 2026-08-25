import type { RefResourceTargets } from "../../libs/refs/types.js";
import type { UserRefData } from "../../libs/refs/users/types.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getUserRefs: ServiceFn<
	[{ targets: RefResourceTargets }],
	UserRefData
> = async (context, data) => {
	const ids = Array.from(
		new Set(
			Array.from(data.targets.values()).flatMap((values) =>
				Array.from(values).filter(
					(value): value is number => typeof value === "number",
				),
			),
		),
	);
	if (ids.length === 0) return { data: [], error: undefined };

	const User = new UsersRepository(context.db);
	const userRes = await User.selectMultipleByIds({
		ids,
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

export default getUserRefs;
