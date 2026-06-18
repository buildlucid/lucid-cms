import constants from "../../constants/constants.js";
import getEmailAdapter from "../../libs/email/get-adapter.js";
import { settingsFormatter } from "../../libs/formatters/index.js";
import getImageProcessor from "../../libs/image-processor/get-processor.js";
import passthroughProcessor from "../../libs/image-processor/processors/passthrough.js";
import getMediaAdapter from "../../libs/media/get-adapter.js";
import type { LucidAuth } from "../../types/hono.js";
import type { Settings, SettingsInclude } from "../../types/response.js";
import { multiTenancyEnabled } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import {
	mediaServices,
	optionServices,
	processedImageServices,
} from "../index.js";
import {
	getLicenseOptionBaseName,
	getLicenseOptionName,
} from "../license/helpers/option-names.js";

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
	const tenantKey = context.request.tenantKey ?? null;
	const [
		optionsRes,
		processedImageCountRes,
		mediaAdapter,
		emailAdapter,
		image,
		mediaStorageUsed,
	] = await Promise.all([
		optionServices.getMultiple(context, {
			names: [
				getLicenseOptionName(tenantKey, "license_key_display"),
				"system_alert_email",
			],
		}),
		processedImageServices.getCount(context),
		getMediaAdapter(context.config),
		getEmailAdapter(context.config),
		getImageProcessor(context.config),
		mediaServices.getStorageUsage(context, {
			tenantKey,
			includeAllBuckets: !multiTenancyEnabled(context.config),
		}),
	]);
	if (processedImageCountRes.error) return processedImageCountRes;
	if (optionsRes.error) return optionsRes;
	if (mediaStorageUsed.error) return mediaStorageUsed;

	const licenseKeyDisplayRes = optionsRes.data.find(
		(o) => getLicenseOptionBaseName(o.name) === "license_key_display",
	);
	const systemAlertEmailRes = optionsRes.data.find(
		(o) => o.name === "system_alert_email",
	);

	const defaultTemplates = Object.values(constants.email.templates).map(
		(template) => template.key,
	);
	const preRenderedTemplates = context.config.preRenderedEmailTemplates
		? Object.keys(context.config.preRenderedEmailTemplates)
		: [];
	const emailTemplates = Array.from(
		new Set([...defaultTemplates, ...preRenderedTemplates]),
	);
	const imageProcessorKey =
		image === passthroughProcessor ? "passthrough" : "custom";

	return {
		error: undefined,
		data: settingsFormatter.formatSingle({
			settings: {
				mediaStorageUsed: mediaStorageUsed.data.total,
				processedImageCount: processedImageCountRes.data,
				licenseKey: licenseKeyDisplayRes?.valueText ?? null,
				mediaAdapterEnabled: mediaAdapter.enabled,
				mediaAdapterKey: mediaAdapter.enabled ? mediaAdapter.adapter.key : null,
				emailAdapterKey: emailAdapter.adapter.key,
				emailSimulated: emailAdapter.simulated,
				emailTemplates,
				imageProcessorKey,
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
