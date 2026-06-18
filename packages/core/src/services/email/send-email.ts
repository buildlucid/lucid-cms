import constants from "../../constants/constants.js";
import { normalizeEmailAttachments } from "../../libs/email/attachments.js";
import getEmailAdapter from "../../libs/email/get-adapter.js";
import {
	createStoredEmailData,
	type EmailStorageConfig,
	normalizeEmailStorageConfig,
	resolveEmailData,
} from "../../libs/email/storage/index.js";
import type {
	EmailAttachment,
	EmailHeaders,
	EmailPriority,
	EmailSubject,
} from "../../libs/email/types.js";
import { emailsFormatter } from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import {
	EmailAttachmentsRepository,
	EmailsRepository,
	EmailTenantsRepository,
	EmailTransactionsRepository,
} from "../../libs/repositories/index.js";
import type { Email } from "../../types/response.js";
import {
	getBaseUrl,
	getEmailFrom,
	getTenantConfig,
	resolveEmailBrandName,
} from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import mergeEmailContextData from "./helpers/merge-email-context-data.js";

const sendEmail: ServiceFn<
	[
		{
			type: "internal" | "external";
			to: string | string[];
			subject: EmailSubject;
			template: string;
			cc?: string;
			bcc?: string;
			replyTo?: string;
			priority?: EmailPriority;
			headers?: EmailHeaders;
			attachments?: EmailAttachment[];
			data: Record<string, unknown>;
			storage?: EmailStorageConfig;
			tenantKeys?: string[];
			from?: {
				email?: string;
				name?: string;
			};
		},
	],
	{
		jobId: string;
		email: Email;
	}
> = async (context, data) => {
	const Emails = new EmailsRepository(context.db.client, context.config.db);
	const EmailTransactions = new EmailTransactionsRepository(
		context.db.client,
		context.config.db,
	);
	const EmailAttachments = new EmailAttachmentsRepository(
		context.db.client,
		context.config.db,
	);
	const EmailTenants = new EmailTenantsRepository(
		context.db.client,
		context.config.db,
	);

	const emailFrom = getEmailFrom(context.config, context.request.url);
	const fromAddress = data.from?.email ?? emailFrom.email;
	const fromName = data.from?.name ?? emailFrom.name;
	const toAddress = Array.isArray(data.to) ? data.to.join(",") : data.to;
	const brandName = resolveEmailBrandName({
		config: context.config,
		translate: context.translate,
		tenantKey: context.request.tenantKey,
	});
	const emailData = mergeEmailContextData({
		data: data.data,
		context: {
			brand: {
				name: brandName ?? "",
				logoPath: constants.email.assets.logo,
			},
			host: getBaseUrl(context),
		},
	});
	const subject =
		typeof data.subject === "function" ? data.subject(emailData) : data.subject;

	const tenantKeys = Array.from(
		new Set(
			data.tenantKeys ??
				(context.request.tenantKey ? [context.request.tenantKey] : []),
		),
	);

	const unknownTenant = tenantKeys.find(
		(key) => getTenantConfig(context.config, key) === undefined,
	);
	if (unknownTenant !== undefined) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.tenants.unknown", {
					data: { key: unknownTenant },
				}),
				status: 400,
			},
			data: undefined,
		};
	}

	const attachmentsRes = normalizeEmailAttachments(data.attachments);
	if (attachmentsRes.error) return attachmentsRes;

	const storageStrategyRes = normalizeEmailStorageConfig(data.storage);
	if (storageStrategyRes.error) return storageStrategyRes;

	const storedDataRes = createStoredEmailData({
		data: emailData,
		storage: storageStrategyRes.data,
		encryptionKey: context.config.secrets.encryption,
	});
	if (storedDataRes.error) return storedDataRes;

	const [newEmailRes, emailAdapter] = await Promise.all([
		Emails.createSingle({
			data: {
				from_address: fromAddress,
				from_name: fromName,
				to_address: toAddress,
				subject,
				template: data.template,
				priority: data.priority ?? "normal",
				headers: data.headers ?? null,
				cc: data.cc,
				bcc: data.bcc,
				data: storedDataRes.data,
				storage_strategy: storageStrategyRes.data,
				type: data.type,
				current_status: "scheduled",
				attempt_count: 0,
				last_attempted_at: undefined,
			},
			returnAll: true,
			validation: {
				enabled: true,
				defaultError: {
					status: 500,
				},
			},
		}),
		getEmailAdapter(context.config),
	]);
	if (newEmailRes.error) return newEmailRes;

	if (tenantKeys.length > 0) {
		const createTenantsRes = await EmailTenants.createMultiple({
			data: tenantKeys.map((tenantKey) => ({
				email_id: newEmailRes.data.id,
				tenant_key: tenantKey,
			})),
		});
		if (createTenantsRes.error) return createTenantsRes;
	}

	if (attachmentsRes.data.length > 0) {
		const attachmentsCreateRes = await EmailAttachments.createMultiple({
			data: attachmentsRes.data.map((attachment, index) => ({
				email_id: newEmailRes.data.id,
				type: attachment.type,
				url: attachment.url,
				filename: attachment.filename,
				content_type: attachment.contentType ?? null,
				disposition: attachment.disposition ?? "attachment",
				content_id: attachment.contentId ?? null,
				order: index,
			})),
			returning: ["id"],
			validation: {
				enabled: true,
				defaultError: {
					status: 500,
				},
			},
		});
		if (attachmentsCreateRes.error) return attachmentsCreateRes;
	}

	const initialTransactionRes = await EmailTransactions.createSingle({
		data: {
			email_id: newEmailRes.data.id,
			delivery_status: "scheduled",
			message: null,
			strategy_identifier: emailAdapter.adapter.key,
			strategy_data: null,
			simulate: emailAdapter.simulated,
			external_message_id: null,
		},
		returnAll: true,
	});
	if (initialTransactionRes.error) return initialTransactionRes;

	const queueRes = await context.queue.add("email:send", {
		payload: {
			emailId: newEmailRes.data.id,
			transactionId: initialTransactionRes.data?.id ?? 0,
		},
		options: {
			tenantKeys,
		},
		context: context,
	});
	if (queueRes.error) {
		//* if queueing fails, update email and transaction to failed
		await Promise.all([
			Emails.updateSingle({
				where: [
					{
						key: "id",
						operator: "=",
						value: newEmailRes.data.id,
					},
				],
				data: {
					current_status: "failed",
					updated_at: new Date().toISOString(),
				},
			}),
			EmailTransactions.updateSingle({
				where: [
					{
						key: "id",
						operator: "=",
						value: initialTransactionRes.data?.id ?? 0,
					},
				],
				data: {
					delivery_status: "failed",
					message:
						context.translate.english(queueRes.error.message) ||
						"Failed to queue email",
					updated_at: new Date().toISOString(),
				},
			}),
		]);
		return queueRes;
	}

	const previewDataRes = resolveEmailData({
		data: newEmailRes.data.data,
		storage: newEmailRes.data.storage_strategy,
		encryptionKey: context.config.secrets.encryption,
		mode: "preview",
	});
	if (previewDataRes.error) return previewDataRes;

	return {
		error: undefined,
		data: {
			jobId: queueRes.data.jobId,
			email: emailsFormatter.formatSingle({
				email: newEmailRes.data,
				data: previewDataRes.data,
				attachments: attachmentsRes.data,
				html: undefined,
				resendWindowDays: context.config.email.resendWindowDays,
			}),
		},
	};
};

export default sendEmail;
