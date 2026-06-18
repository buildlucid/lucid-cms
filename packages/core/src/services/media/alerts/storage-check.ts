import constants from "../../../constants/constants.js";
import type { AlertExecutionPayload } from "../../../libs/alerts/types.js";
import {
	AlertsRepository,
	OptionsRepository,
} from "../../../libs/repositories/index.js";
import {
	formatBytes,
	multiTenancyEnabled,
} from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import sendEmail from "../../email/send-email.js";
import getStorageUsage from "../get-storage-usage.js";
import { getMediaStorageOptionName } from "../helpers/storage-usage-options.js";

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
		getStorageUsage(
			context,
			multiTenancyEnabled(context.config)
				? { grouped: true }
				: { includeAllBuckets: true },
		),
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

	const alertEmail = alertEmailRes.data?.value_text ?? null;
	const buckets = storageUsageRes.data.buckets ?? [
		{
			tenantKey: null,
			total: storageUsageRes.data.total,
		},
	];

	for (const bucket of buckets) {
		const tenantConfig = bucket.tenantKey
			? context.config.tenants.find((tenant) => tenant.key === bucket.tenantKey)
			: undefined;
		const tenantScope =
			bucket.tenantKey === null
				? undefined
				: (tenantConfig?.name ?? bucket.tenantKey);
		const storageUsed = bucket.total;
		const storageRemaining = Math.max(0, storageLimit - storageUsed);
		const rawPercentUsed =
			storageLimit <= 0 ? 100 : (storageUsed / storageLimit) * 100;
		const percentUsed = Math.max(0, Math.floor(rawPercentUsed));
		const threshold = [...constants.alerts.storage.thresholds]
			.sort((a, b) => a.percent - b.percent)
			.filter((threshold) => rawPercentUsed >= threshold.percent)
			.at(-1);
		if (!threshold) continue;

		const dedupeKey = `storage:${getMediaStorageOptionName(bucket.tenantKey)}:${threshold.percent}`;
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

		if ((recentAlertsRes.data?.length ?? 0) > 0) continue;

		const metadata = {
			source,
			trigger,
			triggerMetadata,
			tenantKey: bucket.tenantKey,
			tenantName: tenantConfig?.name ?? null,
			thresholdPercent: threshold.percent,
			cooldownDays: threshold.cooldownDays,
			percentUsed,
			storageUsed,
			storageLimit,
			storageRemaining,
		};
		const title = context.translate(
			"server:core.alerts.storage.triggered.title",
			{
				data: {
					percent: threshold.percent,
				},
			},
		);
		let emailId: number | null = null;
		if (alertEmail) {
			const sendEmailRes = await sendEmail(context, {
				type: "internal",
				to: alertEmail,
				subject: context.translate("server:core.alerts.storage.email.subject", {
					data: {
						percent: threshold.percent,
					},
				}),
				template: constants.email.templates.storageAlert.key,
				priority: "high",
				data: {
					triggerSource: source,
					thresholdPercent: threshold.percent,
					percentUsed: metadata.percentUsed,
					storageUsed: formatBytes(metadata.storageUsed),
					storageLimit: formatBytes(metadata.storageLimit),
					storageRemaining: formatBytes(metadata.storageRemaining),
					tenantScope,
					repeat: false,
					title,
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
				message: context.translate(
					"server:core.alerts.storage.triggered.message",
					{
						data: {
							percent: threshold.percent,
						},
					},
				),
				metadata,
				email_id: emailId,
			},
			returning: ["id"],
			validation: {
				enabled: true,
			},
		});
		if (alertRes.error) return alertRes;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default storageCheckAlert;
