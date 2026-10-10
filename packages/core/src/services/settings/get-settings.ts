import constants from "../../constants/constants.js";
import isEmailSimulated from "../../libs/email/is-simulated.js";
import { settingsFormatter } from "../../libs/formatters/index.js";
import type { LucidActor } from "../../types/hono.js";
import type { Settings, SettingsInclude } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getMediaStorageUsage from "../media/get-storage-usage.js";
import getProcessedImageCount from "../processed-images/get-count.js";

const getSettings: ServiceFn<
	[
		{
			includes?: SettingsInclude[];
			authUser: LucidActor;
		},
	],
	Settings
> = async (context, data) => {
	const [processedImageCountRes, mediaStorageUsed] = await Promise.all([
		getProcessedImageCount(context),
		getMediaStorageUsage(context),
	]);
	if (processedImageCountRes.error) return processedImageCountRes;
	if (mediaStorageUsed.error) return mediaStorageUsed;

	const defaultTemplates = Object.values(constants.email.templates).map(
		(template) => template.key,
	);
	const preRenderedTemplates = context.config.email.templates
		? Object.keys(context.config.email.templates)
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
				mediaStorageAdapterEnabled: context.mediaStorage !== null,
				mediaStorageAdapterKey: context.mediaStorage?.key ?? null,
				emailAdapterKey: context.email.key,
				emailSimulated: isEmailSimulated(context),
				emailTemplates,
				mediaDeliveryAdapterKey: context.mediaDelivery.key,
				runtimeKey: context.runtimeContext?.runtime ?? null,
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
