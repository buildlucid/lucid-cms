import T from "../translations/index.js";
import { Webhook } from "svix";
import type { EmailDeliveryStatus, ServiceFn } from "@lucidcms/core/types";
import type { PluginOptions } from "../types/types.js";
import { controllerSchemas } from "../schema/webhook.js";

const webhook: ServiceFn<
	[
		{
			rawBody: string;
			headers: Record<string, string>;
			pluginOptions: PluginOptions;
		},
	],
	boolean
> = async (context, data) => {
	if (!data.pluginOptions.webhook?.enabled) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: T("webhook_not_enabled"),
			},
			data: undefined,
		};
	}

	if (!data.pluginOptions.webhook?.secret) {
		return {
			error: {
				type: "basic",
				status: 500,
				message: T("webhook_secret_not_configured"),
			},
			data: undefined,
		};
	}

	const wh = new Webhook(data.pluginOptions.webhook.secret);

	try {
		wh.verify(data.rawBody, data.headers);
	} catch (error) {
		return {
			error: {
				type: "authorisation",
				status: 401,
				message: T("invalid_webhook_signature"),
			},
			data: undefined,
		};
	}

	const jsonBody = JSON.parse(data.rawBody);
	const body = controllerSchemas.webhook.body.safeParse(jsonBody);

	if (!body.success) {
		return {
			error: {
				type: "validation",
				status: 400,
				message: T("invalid_webhook_body"),
			},
			data: undefined,
		};
	}

	const validEventTypes = [
		"email.bounced",
		"email.clicked",
		"email.complained",
		"email.delivered",
		"email.delivery_delayed",
		"email.failed",
		"email.opened",
		"email.scheduled",
		"email.sent",
	];
	if (!validEventTypes.includes(body.data.type)) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: T("invalid_event_type"),
			},
			data: undefined,
		};
	}

	const transaction = await context.db
		.selectFrom("lucid_email_transactions")
		.select(["id", "email_id", "updated_at"])
		.where("external_message_id", "=", body.data.data.email_id)
		.executeTakeFirst();
	if (!transaction) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: T("transaction_not_found"),
			},
		};
	}

	const webhookTimestamp = new Date(body.data.created_at);
	const lastUpdateTimestamp = new Date(transaction.updated_at ?? "");

	if (webhookTimestamp <= lastUpdateTimestamp) {
		//* ignore the old webhook
		return {
			error: undefined,
			data: true,
		};
	}

	let newDeliveryStatus: EmailDeliveryStatus;
	switch (body.data.type) {
		case "email.bounced":
			newDeliveryStatus = "bounced";
			break;
		case "email.complained":
			newDeliveryStatus = "complained";
			break;
		case "email.delivered":
			newDeliveryStatus = "delivered";
			break;
		case "email.delivery_delayed":
			newDeliveryStatus = "delayed";
			break;
		case "email.failed":
			newDeliveryStatus = "failed";
			break;
		case "email.opened":
			newDeliveryStatus = "opened";
			break;
		case "email.scheduled":
			newDeliveryStatus = "scheduled";
			break;
		case "email.sent":
			newDeliveryStatus = "sent";
			break;
		case "email.clicked":
			newDeliveryStatus = "clicked";
			break;
		default:
			newDeliveryStatus = "sent";
			break;
	}

	await Promise.all([
		context.db
			.updateTable("lucid_email_transactions")
			.set({
				delivery_status: newDeliveryStatus,
				updated_at: webhookTimestamp.toISOString(),
			})
			.where("id", "=", transaction.id)
			.execute(),
		context.db
			.updateTable("lucid_emails")
			.set({
				current_status: newDeliveryStatus,
				updated_at: new Date().toISOString(),
			})
			.where("id", "=", transaction.email_id)
			.execute(),
	]);

	return {
		error: undefined,
		data: true,
	};
};

export default webhook;
