import constants from "../../constants/constants.js";
import isEmailSimulated from "../../libs/email/is-simulated.js";
import { settingsFormatter } from "../../libs/formatters/index.js";
import getImageProcessor from "../../libs/image-processor/get-adapter.js";
import type { LucidAuth } from "../../types/hono.js";
import type { Settings, SettingsInclude } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getMediaStorageUsage from "../media/get-storage-usage.js";
import getOptions from "../options/get-multiple.js";
import getProcessedImageCount from "../processed-images/get-count.js";

const getSettings: ServiceFn<
	[
		{
			includes?: SettingsInclude[];
			runtime: string;
			authUser: LucidAuth;
		},
	],
	Settings
> = async (context, data) => {
	const [optionsRes, processedImageCountRes, imageProcessor, mediaStorageUsed] =
		await Promise.all([
			getOptions(context, {
				names: ["system_alert_email"],
			}),
			getProcessedImageCount(context),
			getImageProcessor(context.config),
			getMediaStorageUsage(context),
		]);
	if (processedImageCountRes.error) return processedImageCountRes;
	if (optionsRes.error) return optionsRes;
	if (mediaStorageUsed.error) return mediaStorageUsed;

	const systemAlertEmailRes = optionsRes.data.find(
		(o) => o.name === "system_alert_email",
	);

	const defaultTemplates = Object.values(constants.email.templates).map(
		(template) => template.key,
	);
	const preRenderedTemplates = context.config.email.templates.rendered
		? Object.keys(context.config.email.templates.rendered)
		: [];
	const emailTemplates = Array.from(
		new Set([...defaultTemplates, ...preRenderedTemplates]),
	);

	return {
		error: undefined,
		data: settingsFormatter.formatSingle({
			settings: {
				mediaStorageUsed: mediaStorageUsed.data.total,
				processedImageCount: processedImageCountRes.data,
				mediaAdapterEnabled: context.media !== null,
				mediaAdapterKey: context.media?.key ?? null,
				emailAdapterKey: context.email.key,
				emailSimulated: isEmailSimulated(context),
				emailTemplates,
				imageProcessorKey: imageProcessor.key,
				systemAlertEmail: systemAlertEmailRes?.valueText ?? null,
				runtimeKey: data.runtime,
				queueKey: context.queue.key,
				kvKey: context.kv.key,
				databaseKey: context.config.db.adapter,
			},
			config: context.config,
			includes: data.includes,
			authUser: data.authUser,
		}),
	};
};

export default getSettings;
