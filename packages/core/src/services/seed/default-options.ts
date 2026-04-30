import { OptionsRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { ServiceContext, ServiceFn } from "../../utils/services/types.js";

const defaultOptions: ServiceFn<[], undefined> = async (
	context: ServiceContext,
) => {
	try {
		const Options = new OptionsRepository(context.db.client, context.config.db);

		const mediaStorageOptionRes = await Options.selectSingle({
			select: ["name"],
			where: [
				{
					key: "name",
					operator: "=",
					value: "media_storage_used",
				},
			],
		});
		if (mediaStorageOptionRes.error) return mediaStorageOptionRes;

		if (mediaStorageOptionRes.data === undefined) {
			const createStorageOptionRes = await Options.createSingle({
				data: {
					name: "media_storage_used",
					value_int: 0,
				},
				returning: ["name", "value_int"],
				validation: {
					enabled: true,
				},
			});
			if (createStorageOptionRes.error) return createStorageOptionRes;
		}

		const systemAlertEmailOptionRes = await Options.selectSingle({
			select: ["name"],
			where: [
				{
					key: "name",
					operator: "=",
					value: "system_alert_email",
				},
			],
		});
		if (systemAlertEmailOptionRes.error) return systemAlertEmailOptionRes;

		if (systemAlertEmailOptionRes.data === undefined) {
			const createSystemAlertEmailOptionRes = await Options.createSingle({
				data: {
					name: "system_alert_email",
					value_text: null,
				},
				returning: ["name", "value_text"],
				validation: {
					enabled: true,
				},
			});
			if (createSystemAlertEmailOptionRes.error) {
				return createSystemAlertEmailOptionRes;
			}
		}

		return {
			error: undefined,
			data: undefined,
		};
	} catch (_error) {
		return {
			error: {
				type: "basic",
				message: T("option_error_occurred_saving_default"),
			},
			data: undefined,
		};
	}
};

export default defaultOptions;
