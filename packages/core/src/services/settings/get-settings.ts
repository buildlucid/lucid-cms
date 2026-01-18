import constants from "../../constants/constants.js";
import getEmailAdapter from "../../libs/email-adapter/get-adapter.js";
import { settingsFormatter } from "../../libs/formatters/index.js";
import getImageProcessor from "../../libs/image-processor/get-processor.js";
import passthroughProcessor from "../../libs/image-processor/processors/passthrough.js";
import getMediaAdapter from "../../libs/media-adapter/get-adapter.js";
import type {
	SettingsInclude,
	SettingsResponse,
} from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { optionServices, processedImageServices } from "../index.js";

const getSettings: ServiceFn<
	[
		{
			includes?: SettingsInclude[];
			runtime: string;
		},
	],
	SettingsResponse
> = async (context, data) => {
	const [
		optionsRes,
		processedImageCountRes,
		mediaAdapter,
		emailAdapter,
		image,
	] = await Promise.all([
		optionServices.getMultiple(context, {
			names: ["media_storage_used", "license_key_last4"],
		}),
		processedImageServices.getCount(context),
		getMediaAdapter(context.config),
		getEmailAdapter(context.config),
		getImageProcessor(context.config),
	]);
	if (processedImageCountRes.error) return processedImageCountRes;
	if (optionsRes.error) return optionsRes;

	const mediaStorageUsedRes = optionsRes.data.find(
		(o) => o.name === "media_storage_used",
	);
	const licenseKeyLast4Res = optionsRes.data.find(
		(o) => o.name === "license_key_last4",
	);

	const defaultTemplates = Object.values(constants.emailTemplates);
	const preRenderedTemplates = context.config.preRenderedEmailTemplates
		? Object.keys(context.config.preRenderedEmailTemplates)
		: [];
	const emailTemplates = Array.from(
		new Set([...defaultTemplates, ...preRenderedTemplates]),
	);
	const imageProcessorKey =
		image === passthroughProcessor ? "passthrough" : "sharp";

	return {
		error: undefined,
		data: settingsFormatter.formatSingle({
			settings: {
				mediaStorageUsed: mediaStorageUsedRes?.valueInt || 0,
				processedImageCount: processedImageCountRes.data,
				licenseKeyLast4: licenseKeyLast4Res?.valueText ?? null,
				mediaAdapterEnabled: mediaAdapter.enabled,
				mediaAdapterKey: mediaAdapter.enabled ? mediaAdapter.adapter.key : null,
				emailAdapterKey: emailAdapter.adapter.key,
				emailSimulated: emailAdapter.simulated,
				emailTemplates,
				imageProcessorKey,
				runtimeKey: data.runtime,
				queueKey: context.queue.key,
				kvKey: context.kv.key,
				databaseKey: context.config.db.adapter,
			},
			config: context.config,
			includes: data.includes,
		}),
	};
};

export default getSettings;
