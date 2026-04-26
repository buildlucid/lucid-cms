import getEmailAdapter from "../../../libs/email-adapter/get-adapter.js";
import {
	createStoredEmailData,
	hasNeverStoreEmailStorageRules,
	resolveEmailData,
	stripNeverStoreEmailData,
} from "../../../libs/email-adapter/storage/index.js";
import renderMustacheTemplate from "../../../libs/email-adapter/templates/render-mustache-template.js";
import type { EmailStrategyResponse } from "../../../libs/email-adapter/types.js";
import {
	EmailsRepository,
	EmailTransactionsRepository,
} from "../../../libs/repositories/index.js";
import T from "../../../translations/index.js";
import type { LucidErrorData } from "../../../types/errors.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const sendEmail: ServiceFn<
	[
		{
			emailId: number;
			transactionId: number;
		},
	],
	undefined
> = async (context, data) => {
	const Emails = new EmailsRepository(context.db.client, context.config.db);
	const EmailTransactions = new EmailTransactionsRepository(
		context.db.client,
		context.config.db,
	);

	const [emailRes, emailAdapter] = await Promise.all([
		Emails.selectSingle({
			select: [
				"id",
				"from_address",
				"from_name",
				"to_address",
				"subject",
				"cc",
				"bcc",
				"template",
				"data",
				"storage_strategy",
				"type",
				"attempt_count",
				"created_at",
				"updated_at",
			],
			where: [
				{
					key: "id",
					operator: "=",
					value: data.emailId,
				},
			],
			validation: {
				enabled: true,
				defaultError: {
					message: T("email_not_found_message"),
					status: 404,
				},
			},
		}),
		getEmailAdapter(context.config),
	]);
	if (emailRes.error) return emailRes;

	const sendDataRes = resolveEmailData({
		data: emailRes.data.data,
		storage: emailRes.data.storage_strategy,
		encryptionKey: context.config.secrets.encryption,
		mode: "send",
	});
	const hasNeverStoreRes = hasNeverStoreEmailStorageRules(
		emailRes.data.storage_strategy,
	);

	let preSendError: LucidErrorData | undefined =
		sendDataRes.error ?? hasNeverStoreRes.error;
	let sendData: Record<string, unknown> | null = null;
	let hasNeverStore = false;
	let htmlData: string | undefined;

	if (preSendError === undefined) {
		sendData = sendDataRes.error ? null : sendDataRes.data;
		hasNeverStore = hasNeverStoreRes.error ? false : hasNeverStoreRes.data;

		const html = await renderMustacheTemplate(context, {
			template: emailRes.data.template,
			data: sendData,
		});
		if (html.error) {
			preSendError = html.error;
		} else {
			htmlData = html.data;
		}
	}

	if (preSendError) {
		await Promise.all([
			Emails.updateSingle({
				where: [{ key: "id", operator: "=", value: emailRes.data.id }],
				data: {
					current_status: "failed",
					attempt_count: (emailRes.data.attempt_count ?? 0) + 1,
					last_attempted_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				},
			}),
			EmailTransactions.updateSingle({
				where: [{ key: "id", operator: "=", value: data.transactionId }],
				data: {
					delivery_status: "failed",
					message: preSendError.message,
					updated_at: new Date().toISOString(),
				},
			}),
		]);

		return {
			error: preSendError,
			data: undefined,
		};
	}

	let result: EmailStrategyResponse | undefined;
	if (emailAdapter.simulated) {
		result = {
			success: true,
			deliveryStatus: "sent",
			message: T("email_successfully_sent"),
			data: null,
		};
	} else {
		try {
			result = await emailAdapter.adapter.send(
				{
					to: emailRes.data.to_address,
					subject: emailRes.data.subject ?? "",
					from: {
						email: emailRes.data.from_address,
						name: emailRes.data.from_name,
					},
					html: htmlData ?? "",
					cc: emailRes.data.cc ?? undefined,
					bcc: emailRes.data.bcc ?? undefined,
				},
				{
					data: sendData ?? {},
					template: emailRes.data.template,
				},
			);
		} catch (error) {
			result = {
				success: false,
				deliveryStatus: "failed",
				message:
					error instanceof Error ? error.message : T("email_failed_to_send"),
				externalMessageId: null,
			};
		}
	}

	const shouldStripNeverStore =
		result.success === true && hasNeverStore === true;
	let cleanedData: Record<string, unknown> | null | undefined;

	if (shouldStripNeverStore) {
		const strippedDataRes = stripNeverStoreEmailData({
			data: sendData,
			storage: emailRes.data.storage_strategy,
		});
		if (strippedDataRes.error) return strippedDataRes;

		const cleanedDataRes = createStoredEmailData({
			data: strippedDataRes.data,
			storage: emailRes.data.storage_strategy,
			encryptionKey: context.config.secrets.encryption,
			options: {
				encryptNeverStore: false,
			},
		});
		if (cleanedDataRes.error) return cleanedDataRes;

		cleanedData = cleanedDataRes.data;
	}

	const [updateRes, emailTransactionRes] = await Promise.all([
		Emails.updateSingle({
			where: [
				{
					key: "id",
					operator: "=",
					value: emailRes.data.id,
				},
			],
			data: {
				current_status: result.deliveryStatus,
				attempt_count: (emailRes.data.attempt_count ?? 0) + 1,
				last_attempted_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
				...(cleanedData !== undefined ? { data: cleanedData } : {}),
			},
		}),
		EmailTransactions.updateSingle({
			where: [
				{
					key: "id",
					operator: "=",
					value: data.transactionId,
				},
			],
			data: {
				delivery_status: result.deliveryStatus,
				message: result.success ? null : result.message,
				strategy_data: result.data,
				external_message_id: result.externalMessageId,
				updated_at: new Date().toISOString(),
			},
		}),
	]);

	if (updateRes.error) return updateRes;
	if (emailTransactionRes.error) return emailTransactionRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default sendEmail;
