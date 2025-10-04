import optionsServices from "../options/index.js";
import Formatter from "../../libs/formatters/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { SettingsResponse } from "../../types/response.js";
import services from "../index.js";

const getSettings: ServiceFn<[], SettingsResponse> = async (context) => {
	const [optionsRes, processedImageCountRes] = await Promise.all([
		optionsServices.getMultiple(context, {
			names: ["media_storage_used", "license_key_last4"],
		}),
		services.processedImage.getCount(context),
	]);
	if (processedImageCountRes.error) return processedImageCountRes;
	if (optionsRes.error) return optionsRes;

	const mediaStorageUsedRes = optionsRes.data.find(
		(o) => o.name === "media_storage_used",
	);
	const licenseKeyLast4Res = optionsRes.data.find(
		(o) => o.name === "license_key_last4",
	);

	const SettingsFormatter = Formatter.get("settings");

	return {
		error: undefined,
		data: SettingsFormatter.formatSingle({
			settings: {
				mediaStorageUsed: mediaStorageUsedRes?.valueInt || 0,
				processedImageCount: processedImageCountRes.data,
				licenseKeyLast4: licenseKeyLast4Res?.valueText ?? null,
			},
			config: context.config,
		}),
	};
};

export default getSettings;
