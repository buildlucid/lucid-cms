import type { Component } from "solid-js";
import type { TableRowProps } from "@/types/components";
import type { EmailDeliveryStatus, EmailResponse } from "@lucidcms/core/types";
import { Tr } from "@/components/Groups/Table";
import type { TableTheme } from "@/components/Groups/Table/Table";
import TextCol from "@/components/Tables/Columns/TextCol";
import PillCol from "@/components/Tables/Columns/PillCol";
import DateCol from "../Columns/DateCol";
import type { PillProps } from "@/components/Partials/Pill";

interface EmailTransactionRowProps extends TableRowProps {
	transaction: EmailResponse["transactions"][number];
	include: boolean[];
	theme?: TableTheme;
}

const EmailTransactionRow: Component<EmailTransactionRowProps> = (props) => {
	// ----------------------------------
	// Helpers
	const getPillTheme = (
		deliveryStatus: EmailDeliveryStatus,
	): PillProps["theme"] => {
		if (deliveryStatus === "sent" || deliveryStatus === "delivered") {
			return "primary";
		}
		if (deliveryStatus === "failed") {
			return "red";
		}
		return "grey";
	};

	// ----------------------------------
	// Render
	return (
		<Tr
			index={props.index}
			selected={props.selected}
			actions={[]}
			options={props.options}
			callbacks={props.callbacks}
			theme={props.theme}
		>
			<PillCol
				text={props.transaction.deliveryStatus}
				theme={getPillTheme(props.transaction.deliveryStatus)}
				options={{
					include: props?.include[0],
					padding: props.options?.padding,
				}}
			/>
			<TextCol
				text={props.transaction.strategyIdentifier}
				options={{
					include: props?.include[1],
					padding: props.options?.padding,
				}}
			/>
			<TextCol
				text={props.transaction.message}
				options={{
					include: props?.include[2],
					maxLines: 2,
					padding: props.options?.padding,
				}}
			/>
			<DateCol
				date={props.transaction.createdAt}
				options={{
					include: props?.include[3],
					padding: props.options?.padding,
				}}
			/>
			<DateCol
				date={props.transaction.updatedAt}
				options={{
					include: props?.include[4],
					padding: props.options?.padding,
				}}
			/>
		</Tr>
	);
};

export default EmailTransactionRow;
