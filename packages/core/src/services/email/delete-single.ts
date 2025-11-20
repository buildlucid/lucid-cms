import { EmailsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const deleteSingle: ServiceFn<
	[
		{
			id: number;
		},
	],
	undefined
> = async (context, data) => {
	const Emails = new EmailsRepository(context.db, context.config.db);

	const deleteEmailRes = await Emails.deleteSingle({
		returning: ["id"],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				status: 500,
			},
		},
	});
	if (deleteEmailRes.error) return deleteEmailRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSingle;
