import type {
	EmailAttachment as EmailAttachmentInput,
	EmailDeliveryStatus,
	EmailPriority,
	EmailStorageConfig,
	EmailType,
} from "../../exports/types.js";
import type { Email, EmailTransaction } from "../../types/response.js";
import type { LucidEmailTransactions } from "../db/tables/email-transactions.js";
import type { Select } from "../db/types.js";
import { getEmailResendState } from "../email/storage/index.js";
import formatter from "./helpers.js";

interface EmailPropT {
	id: number;
	from_address: string;
	from_name: string;
	to_address: string;
	subject: string;
	cc: string | null;
	bcc: string | null;
	template: string;
	priority: EmailPriority;
	type: EmailType;
	current_status: EmailDeliveryStatus;
	attempt_count: number;
	last_attempted_at: Date | string | null;
	created_at: Date | string | null;
	updated_at: Date | string | null;
	data?: Record<string, unknown> | null;
	storage_strategy?: EmailStorageConfig | null;
	attachments?: EmailAttachmentRowPropT[];
}

interface EmailAttachmentRowPropT {
	type: "url";
	url: string;
	filename: string;
	content_type: string | null;
	disposition: "attachment" | "inline";
	content_id: string | null;
	order: number;
}

const formatAttachment = (
	attachment: EmailAttachmentInput | EmailAttachmentRowPropT,
) => {
	if ("content_type" in attachment) {
		return {
			type: attachment.type,
			url: attachment.url,
			filename: attachment.filename,
			contentType: attachment.content_type,
			disposition: attachment.disposition,
			contentId: attachment.content_id,
		};
	}

	return {
		type: attachment.type,
		url: attachment.url,
		filename: attachment.filename,
		contentType: attachment.contentType ?? null,
		disposition: attachment.disposition ?? "attachment",
		contentId: attachment.contentId ?? null,
	};
};

const formatMultiple = (props: {
	emails: EmailPropT[];
	resendWindowDays: number;
}) => {
	return props.emails.map((e) =>
		formatSingle({
			email: e,
			resendWindowDays: props.resendWindowDays,
		}),
	);
};

const formatSingle = (props: {
	email: EmailPropT;
	data?: Record<string, unknown> | null;
	attachments?: EmailAttachmentInput[];
	html?: string;
	resendWindowDays: number;
}): Email => {
	const resend = getEmailResendState({
		createdAt: props.email.created_at,
		storage: props.email.storage_strategy,
		resendWindowDays: props.resendWindowDays,
	});

	return {
		id: props.email.id,
		type: props.email.type,
		currentStatus: props.email.current_status,
		mailDetails: {
			from: {
				address: props.email.from_address,
				name: props.email.from_name,
			},
			to: props.email.to_address,
			subject: props.email.subject,
			cc: props.email.cc,
			bcc: props.email.bcc,
			template: props.email.template,
			priority: props.email.priority,
		},
		data: props.data ?? props.email.data ?? null,
		attachments: (props.attachments ?? props.email.attachments ?? []).map(
			formatAttachment,
		),
		html: props.html ?? null,
		resend: resend.data ?? {
			enabled: false,
			reason: "outsideResendWindow",
		},
		attemptCount: props.email.attempt_count,
		lastAttemptedAt: formatter.formatDate(props.email.last_attempted_at),
		createdAt: formatter.formatDate(props.email.created_at),
		updatedAt: formatter.formatDate(props.email.updated_at),
	};
};

const formatTransactions = (
	transactions: Select<LucidEmailTransactions>[],
): EmailTransaction[] =>
	transactions.map((transaction) => ({
		id: transaction.id,
		emailId: transaction.email_id,
		deliveryStatus: transaction.delivery_status,
		message: transaction.message,
		strategyIdentifier: transaction.strategy_identifier,
		strategyData: transaction.strategy_data,
		externalMessageId: transaction.external_message_id,
		simulate: formatter.formatBoolean(transaction.simulate),
		createdAt: formatter.formatDate(transaction.created_at),
		updatedAt: formatter.formatDate(transaction.updated_at),
	}));

export default {
	formatMultiple,
	formatSingle,
	formatTransactions,
};
