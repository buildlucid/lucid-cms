import { OptionsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const updateSystemAlerts: ServiceFn<
	[
		{
			alertEmail: string | null;
		},
	],
	undefined
> = async (context, data) => {
	const Options = new OptionsRepository(context.db.client, context.config.db);

	const alertEmail = data.alertEmail?.trim() || null;

	const updateRes = await Options.upsertSingle({
		data: {
			name: "system_alert_email",
			value_text: alertEmail,
		},
	});
	if (updateRes.error) return updateRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateSystemAlerts;
