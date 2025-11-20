import formatter from "./index.js";
import type { EmailResponse } from "../../types/response.js";
import type {
	BooleanInt,
	EmailType,
	EmailDeliveryStatus,
} from "../../types.js";

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
}) => {
	return props.emails.map((e) =>
		formatSingle({
			email: e,
		}),
	);
};

const formatSingle = (props: {
	email: EmailPropT;
	html?: string;
}): EmailResponse => {
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
		data: props.email.data ?? null,
		html: props.html ?? null,
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
