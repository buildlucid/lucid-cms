import Repository from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const deleteSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	undefined
> = async (context, data) => {
	const EmailsRepo = Repository.get("emails", context.db, context.config.db);

	const deleteEmailRes = await EmailsRepo.deleteSingle({
		returning: ["id"],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
	});
	if (deleteEmailRes.error) return deleteEmailRes;

	if (!deleteEmailRes.data) {
		return {
			error: {
				status: 500,
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSingle;
