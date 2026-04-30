import constants from "../../../constants/constants.js";
import type { AlertExecutionPayload } from "../../../libs/alerts/types.js";
import {
	AlertsRepository,
	OptionsRepository,
} from "../../../libs/repositories/index.js";
import T from "../../../translations/index.js";
import { formatBytes } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import sendEmail from "../../email/send-email.js";
import getStorageUsage from "../get-storage-usage.js";

const storageCheckAlert: ServiceFn<[AlertExecutionPayload], undefined> = async (
	context,
	data,
) => {
	const storageLimit = context.config.media.limits.storage;
	if (storageLimit === false) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const source = data?.source ?? "cron";
	const trigger = data?.trigger ?? "scheduled";
	const triggerMetadata = data?.metadata ?? {};
	const Alerts = new AlertsRepository(context.db.client, context.config.db);
	const Options = new OptionsRepository(context.db.client, context.config.db);

	const [storageUsageRes, alertEmailRes] = await Promise.all([
		getStorageUsage(context),
		Options.selectSingle({
			select: ["value_text"],
			where: [
				{
					key: "name",
					operator: "=",
					value: "system_alert_email",
				},
			],
		}),
	]);
	if (storageUsageRes.error) return storageUsageRes;
	if (alertEmailRes.error) return alertEmailRes;

	const storageUsed = storageUsageRes.data.total;
	const storageRemaining = Math.max(0, storageLimit - storageUsed);
	const rawPercentUsed =
		storageLimit <= 0 ? 100 : (storageUsed / storageLimit) * 100;
	const percentUsed = Math.max(0, Math.floor(rawPercentUsed));
	const alertEmail = alertEmailRes.data?.value_text ?? null;
	const threshold = [...constants.alerts.storage.thresholds]
		.sort((a, b) => a.percent - b.percent)
		.filter((threshold) => rawPercentUsed >= threshold.percent)
		.at(-1);
	if (!threshold) return { error: undefined, data: undefined };

	const dedupeKey = `storage:${threshold.percent}`;
	const cooldownDate = new Date(
		Date.now() - threshold.cooldownDays * 24 * 60 * 60 * 1000,
	).toISOString();
	const recentAlertsRes = await Alerts.selectMultiple({
		select: ["id"],
		where: [
			{
				key: "type",
				operator: "=",
				value: constants.alerts.storage.type,
			},
			{
				key: "dedupe_key",
				operator: "=",
				value: dedupeKey,
			},
			{
				key: "created_at",
				operator: ">=",
				value: cooldownDate,
			},
		],
	});
	if (recentAlertsRes.error) return recentAlertsRes;

	if ((recentAlertsRes.data?.length ?? 0) > 0) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const metadata = {
		source,
		trigger,
		triggerMetadata,
		thresholdPercent: threshold.percent,
		cooldownDays: threshold.cooldownDays,
		percentUsed,
		storageUsed,
		storageLimit,
		storageRemaining,
	};
	const title = T("storage_alert_triggered_title", {
		percent: threshold.percent,
	});
	let emailId: number | null = null;
	if (alertEmail) {
		const sendEmailRes = await sendEmail(context, {
			type: "internal",
			to: alertEmail,
			subject: T("storage_alert_email_subject", {
				percent: threshold.percent,
			}),
			template: constants.email.templates.storageAlert.key,
			priority: "high",
			data: {
				brand: context.config.brand,
				triggerSource: source,
				thresholdPercent: threshold.percent,
				percentUsed: metadata.percentUsed,
				storageUsed: formatBytes(metadata.storageUsed),
				storageLimit: formatBytes(metadata.storageLimit),
				storageRemaining: formatBytes(metadata.storageRemaining),
				repeat: false,
				title,
				logoUrl: constants.email.assets.logo,
			},
			storage: constants.email.templates.storageAlert.storage ?? undefined,
		});
		if (sendEmailRes.error) return sendEmailRes;

		emailId = sendEmailRes.data.email.id;
	}

	const alertRes = await Alerts.createSingle({
		data: {
			type: constants.alerts.storage.type,
			level: threshold.level,
			dedupe_key: dedupeKey,
			title,
			message: T("storage_alert_triggered_message", {
				percent: threshold.percent,
			}),
			metadata,
			email_id: emailId,
		},
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (alertRes.error) return alertRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default storageCheckAlert;
