import type { Email } from "../../types/response.js";
import type {
	BooleanInt,
	EmailDeliveryStatus,
	EmailStorageConfig,
	EmailType,
} from "../../types.js";
import { getEmailResendState } from "../email-adapter/storage/index.js";
import formatter from "./index.js";

interface EmailPropT {
	id: number;
	from_address: string;
	from_name: string;
	to_address: string;
	subject: string;
	cc: string | null;
	bcc: string | null;
	template: string;
	type: EmailType;
	current_status: EmailDeliveryStatus;
	attempt_count: number;
	last_attempted_at: Date | string | null;
	created_at: Date | string | null;
	updated_at: Date | string | null;
	data?: Record<string, unknown> | null;
	storage_strategy?: EmailStorageConfig | null;
	transactions?: {
		delivery_status: EmailDeliveryStatus;
		message: string | null;
		strategy_identifier: string;
		strategy_data: Record<string, unknown> | null;
		simulate: BooleanInt;
		external_message_id: string | null;
		created_at: Date | string | null;
		updated_at: Date | string | null;
	}[];
}

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
		},
		data: props.data ?? props.email.data ?? null,
		html: props.html ?? null,
		resend: resend.data ?? {
			enabled: false,
			reason: "outsideResendWindow",
		},
		transactions: props.email.transactions
			? props.email.transactions.map((t) => ({
					deliveryStatus: t.delivery_status,
					message: t.message,
					strategyIdentifier: t.strategy_identifier,
					strategyData: t.strategy_data,
					simulate: formatter.formatBoolean(t.simulate),
					createdAt: formatter.formatDate(t.created_at),
					externalMessageId: t.external_message_id,
					updatedAt: formatter.formatDate(t.updated_at),
				}))
			: [],
		attemptCount: props.email.attempt_count,
		lastAttemptedAt: formatter.formatDate(props.email.last_attempted_at),
		createdAt: formatter.formatDate(props.email.created_at),
		updatedAt: formatter.formatDate(props.email.updated_at),
	};
};

export default {
	formatMultiple,
	formatSingle,
};
