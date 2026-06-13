import { copy } from "../../libs/i18n/index.js";
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
	const Emails = new EmailsRepository(context.db.client, context.config.db);

	const emailRes = await Emails.selectSingleById({
		id: data.id,
		tenantKey: context.request.tenantKey,
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.email.not.found.message"),
				status: 404,
			},
		},
	});
	if (emailRes.error) return emailRes;

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
