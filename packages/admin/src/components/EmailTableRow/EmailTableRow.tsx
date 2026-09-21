import type { Email, EmailDeliveryStatus } from "@types";
import type { Component } from "solid-js";
import type { PillProps } from "@/components/Pill/Pill";
import TableDateCell from "@/components/TableDateCell/TableDateCell";
import TablePillCell from "@/components/TablePillCell/TablePillCell";
import { TableRow } from "@/components/TableRow/TableRow";
import TableTextCell from "@/components/TableTextCell/TableTextCell";
import { Permissions } from "@/constants/permissions";
import type useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import type { TableRowProps } from "@/types/components";

interface EmailRowProps extends TableRowProps {
	email: Email;
	include: boolean[];
	rowTarget: ReturnType<
		typeof useRowTarget<"preview" | "resend" | "delete" | "transactions">
	>;
}

const EmailTableRow: Component<EmailRowProps> = (props) => {
	// ----------------------------------
	// Helpers
	const getPillVariant = (
		deliveryStatus: EmailDeliveryStatus,
	): PillProps["variant"] => {
		if (
			deliveryStatus === "sent" ||
			deliveryStatus === "delivered" ||
			deliveryStatus === "opened" ||
			deliveryStatus === "clicked"
		) {
			return "primary-subtle";
		}
		if (
			deliveryStatus === "failed" ||
			deliveryStatus === "bounced" ||
			deliveryStatus === "complained"
		) {
			return "danger-subtle";
		}
		return "outline";
	};

	// ----------------------------------
	// Render
	return (
		<TableRow
			index={props.index}
			selected={props.selected}
			options={props.options}
			callbacks={props.callbacks}
			actions={[
				{
					label: T()("common.preview"),
					type: "button",
					icon: "eye",
					onClick: () => {
						props.rowTarget.setTargetId(props.email.id);
						props.rowTarget.setTrigger("preview", true);
					},
					permission: userStore.get.hasPermission([Permissions.EmailRead]).all,
					sortOrder: 0,
				},
				{
					label: T()("email.resend.action"),
					type: "button",
					icon: "email",
					onClick: () => {
						props.rowTarget.setTargetId(props.email.id);
						props.rowTarget.setTrigger("resend", true);
					},
					permission: userStore.get.hasPermission([Permissions.EmailSend]).all,
					disabled: props.email.resend.enabled !== true,
					disabledToast: {
						title: T()("toasts.common.resend.email.unavailable.title"),
						message: T()("toasts.common.resend.email.unavailable.message"),
						status: "warning",
					},
					actionExclude: true,
					sortOrder: 1,
				},
				{
					label: T()("common.transactions"),
					type: "button",
					icon: "clock",
					onClick: () => {
						props.rowTarget.setTargetId(props.email.id);
						props.rowTarget.setTrigger("transactions", true);
					},
					permission: userStore.get.hasPermission([Permissions.EmailRead]).all,
					sortOrder: 2,
				},
				{
					label: T()("common.delete"),
					type: "button",
					icon: "trash",
					onClick: () => {
						props.rowTarget.setTargetId(props.email.id);
						props.rowTarget.setTrigger("delete", true);
					},
					permission: userStore.get.hasPermission([Permissions.EmailDelete])
						.all,
					actionExclude: true,
					sortOrder: 3,
				},
			]}
		>
			<TablePillCell
				text={props.email.currentStatus}
				variant={getPillVariant(props.email.currentStatus)}
				options={{ include: props?.include[0] }}
			/>
			<TableTextCell
				text={props.email.mailDetails.subject}
				options={{
					include: props?.include[1],
					minWidth: 320,
					maxLines: 1,
				}}
			/>
			<TableTextCell
				text={props.email.mailDetails.to}
				options={{
					include: props?.include[2],
					minWidth: 240,
					maxLines: 1,
				}}
			/>
			<TableTextCell
				text={props.email.mailDetails.template}
				options={{
					include: props?.include[3],
					minWidth: 180,
					maxLines: 1,
				}}
			/>
			<TableTextCell
				text={props.email.type}
				options={{
					include: props?.include[4],
					minWidth: 120,
					classes: "capitalize",
				}}
			/>
			<TableTextCell
				text={props.email.mailDetails.priority}
				options={{
					include: props?.include[5],
					minWidth: 120,
					classes: "capitalize",
				}}
			/>
			<TableTextCell
				text={props.email.attemptCount || 0}
				options={{ include: props?.include[6], minWidth: 140 }}
			/>
			<TableDateCell
				date={props.email.lastAttemptedAt}
				options={{ include: props?.include[7] }}
			/>
		</TableRow>
	);
};

export default EmailTableRow;
