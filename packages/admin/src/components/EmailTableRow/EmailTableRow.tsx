import type { Email, EmailDeliveryStatus } from "@types";
import type { Component } from "solid-js";
import type { PillProps } from "@/components/Pill/Pill";
import Table from "@/components/Table/Table";
import { Permissions } from "@/constants/permissions";
import type useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import T from "@/translations";

interface EmailRowProps {
	index: number;
	email: Email;
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
			return "success-subtle";
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
		<Table.Row
			index={props.index}
			actions={[
				{
					label: T()("common.preview"),
					type: "button",
					icon: "eye",
					onClick: () => {
						props.rowTarget.setTargetId(props.email.id);
						props.rowTarget.setTrigger("preview", true);
					},
					permission: Permissions.EmailRead,
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
					permission: Permissions.EmailSend,
					disabled: props.email.resend.enabled !== true,
					disabledToast: {
						title: T()("toasts.common.resend.email.unavailable.title"),
						message: T()("toasts.common.resend.email.unavailable.message"),
						status: "warning",
					},
					excludeFromRowClick: true,
					sortOrder: 50,
					variant: "primary",
				},
				{
					label: T()("common.transactions"),
					type: "button",
					icon: "clock",
					onClick: () => {
						props.rowTarget.setTargetId(props.email.id);
						props.rowTarget.setTrigger("transactions", true);
					},
					permission: Permissions.EmailRead,
					sortOrder: 10,
				},
				{
					label: T()("common.delete"),
					type: "button",
					icon: "trash",
					onClick: () => {
						props.rowTarget.setTargetId(props.email.id);
						props.rowTarget.setTrigger("delete", true);
					},
					permission: Permissions.EmailDelete,
					excludeFromRowClick: true,
					sortOrder: 70,
					variant: "danger",
				},
			]}
		>
			<Table.Pill
				column="currentStatus"
				text={props.email.currentStatus}
				variant={getPillVariant(props.email.currentStatus)}
			/>
			<Table.Text
				column="subject"
				text={props.email.mailDetails.subject}
				minWidth={320}
				maxLines={1}
			/>
			<Table.Text
				column="toAddress"
				text={props.email.mailDetails.to}
				minWidth={240}
				maxLines={1}
			/>
			<Table.Text
				column="template"
				text={props.email.mailDetails.template}
				minWidth={180}
				maxLines={1}
			/>
			<Table.Text
				column="type"
				text={props.email.type}
				minWidth={120}
				class="capitalize"
			/>
			<Table.Text
				column="priority"
				text={props.email.mailDetails.priority}
				minWidth={120}
				class="capitalize"
			/>
			<Table.Text
				column="attemptCount"
				text={props.email.attemptCount || 0}
				minWidth={140}
			/>
			<Table.Date column="lastAttemptedAt" date={props.email.lastAttemptedAt} />
		</Table.Row>
	);
};

export default EmailTableRow;
