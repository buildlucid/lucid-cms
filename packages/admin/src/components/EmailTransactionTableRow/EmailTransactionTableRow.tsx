import type { EmailDeliveryStatus, EmailTransaction } from "@types";
import type { Component } from "solid-js";
import type { PillProps } from "@/components/Pill/Pill";
import type { TableTheme } from "@/components/Table/Table";
import TableDateCell from "@/components/TableDateCell/TableDateCell";
import TablePillCell from "@/components/TablePillCell/TablePillCell";
import { TableRow } from "@/components/TableRow/TableRow";
import TableTextCell from "@/components/TableTextCell/TableTextCell";
import type { TableRowProps } from "@/types/components";

interface EmailTransactionRowProps extends TableRowProps {
	transaction: EmailTransaction;
	include: boolean[];
	theme?: TableTheme;
}

const EmailTransactionTableRow: Component<EmailTransactionRowProps> = (
	props,
) => {
	// ----------------------------------
	// Helpers
	const getPillTheme = (
		deliveryStatus: EmailDeliveryStatus,
	): PillProps["theme"] => {
		if (deliveryStatus === "sent" || deliveryStatus === "delivered") {
			return "primary-opaque";
		}
		if (deliveryStatus === "failed") {
			return "error-opaque";
		}
		return "outline";
	};

	// ----------------------------------
	// Render
	return (
		<TableRow
			index={props.index}
			selected={props.selected}
			actions={[]}
			options={props.options}
			callbacks={props.callbacks}
			theme={props.theme}
		>
			<TablePillCell
				text={props.transaction.deliveryStatus}
				theme={getPillTheme(props.transaction.deliveryStatus)}
				options={{
					include: props?.include[0],
					padding: props.options?.padding,
				}}
			/>
			<TableTextCell
				text={props.transaction.strategyIdentifier}
				options={{
					include: props?.include[1],
					padding: props.options?.padding,
				}}
			/>
			<TableTextCell
				text={props.transaction.message}
				options={{
					include: props?.include[2],
					maxLines: 2,
					padding: props.options?.padding,
				}}
			/>
			<TableDateCell
				date={props.transaction.createdAt}
				options={{
					include: props?.include[3],
					padding: props.options?.padding,
				}}
			/>
			<TableDateCell
				date={props.transaction.updatedAt}
				options={{
					include: props?.include[4],
					padding: props.options?.padding,
				}}
			/>
		</TableRow>
	);
};

export default EmailTransactionTableRow;
