import getEmailAdapter from "../../libs/email/get-adapter.js";
import {
	createStoredEmailData,
	type EmailStorageConfig,
	normalizeEmailStorageConfig,
	resolveEmailData,
} from "../../libs/email/storage/index.js";
import { emailsFormatter } from "../../libs/formatters/index.js";
import {
	EmailsRepository,
	EmailTransactionsRepository,
} from "../../libs/repositories/index.js";
import type { Email } from "../../types/response.js";
import { getEmailFrom } from "../../utils/helpers/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

const sendEmail: ServiceFn<
	[
		{
			type: "internal" | "external";
			to: string;
			subject: string;
			template: string;
			cc?: string;
			bcc?: string;
			replyTo?: string;
			data: Record<string, unknown>;
			storage?: EmailStorageConfig;
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

	const emailFrom = getEmailFrom(context.config, context.request.url);
	const fromAddress = data.from?.email ?? emailFrom.email;
	const fromName = data.from?.name ?? emailFrom.name;
	const storageStrategyRes = normalizeEmailStorageConfig(data.storage);
	if (storageStrategyRes.error) return storageStrategyRes;

	const storedDataRes = createStoredEmailData({
		data: data.data,
		storage: storageStrategyRes.data,
		encryptionKey: context.config.secrets.encryption,
	});
	if (storedDataRes.error) return storedDataRes;

	const [newEmailRes, emailAdapter] = await Promise.all([
		Emails.createSingle({
			data: {
				from_address: fromAddress,
				from_name: fromName,
				to_address: data.to,
				subject: data.subject,
				template: data.template,
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
					message: queueRes.error.message || "Failed to queue email",
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
				html: undefined,
				resendWindowDays: context.config.email.resendWindowDays,
			}),
		},
	};
};

export default sendEmail;
