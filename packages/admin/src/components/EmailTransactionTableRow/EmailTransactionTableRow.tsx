import type { EmailDeliveryStatus, EmailTransaction } from "@types";
import type { Component } from "solid-js";
import type { PillProps } from "@/components/Pill/Pill";
import Table from "@/components/Table/Table";

interface EmailTransactionRowProps {
	index: number;
	transaction: EmailTransaction;
}

const EmailTransactionTableRow: Component<EmailTransactionRowProps> = (
	props,
) => {
	// ----------------------------------
	// Helpers
	const getPillVariant = (
		deliveryStatus: EmailDeliveryStatus,
	): PillProps["variant"] => {
		if (deliveryStatus === "sent" || deliveryStatus === "delivered") {
			return "primary-subtle";
		}
		if (deliveryStatus === "failed") {
			return "danger-subtle";
		}
		return "outline";
	};

	// ----------------------------------
	// Render
	return (
		<Table.Row index={props.index}>
			<Table.Pill
				column="status"
				text={props.transaction.deliveryStatus}
				variant={getPillVariant(props.transaction.deliveryStatus)}
			/>
			<Table.Text
				column="identifier"
				text={props.transaction.strategyIdentifier}
			/>
			<Table.Text
				column="message"
				text={props.transaction.message}
				maxLines={2}
			/>
			<Table.Date column="createdAt" date={props.transaction.createdAt} />
			<Table.Date column="updatedAt" date={props.transaction.updatedAt} />
		</Table.Row>
	);
};

export default EmailTransactionTableRow;
