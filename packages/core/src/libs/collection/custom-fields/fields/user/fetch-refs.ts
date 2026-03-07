import type { ServiceFn } from "../../../../../utils/services/types.js";
import type { UserPropT } from "../../../../formatters/users.js";
import { UsersRepository } from "../../../../repositories/index.js";
import type {
	FieldRefFetchInput,
	FieldRefFetchOutput,
} from "../../utils/ref-fetch.js";

const fetchUserRefs: ServiceFn<
	[FieldRefFetchInput],
	FieldRefFetchOutput
> = async (context, data) => {
	const User = new UsersRepository(context.db.client, context.config.db);
	const ids = Array.from(
		new Set(
			data.relations.flatMap((relation) =>
				Array.from(relation.values).filter(
					(value): value is number => typeof value === "number",
				),
			),
		),
	);

	if (ids.length === 0) {
		return {
			data: {
				rows: [] satisfies UserPropT[],
			},
			error: undefined,
		};
	}

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
		data: {
			rows: userRes.data,
		},
	};
};

export default fetchUserRefs;
