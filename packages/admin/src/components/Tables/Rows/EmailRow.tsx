import type { Email, EmailDeliveryStatus } from "@types";
import type { Component } from "solid-js";
import { Tr } from "@/components/Groups/Table/Tr";
import type { PillProps } from "@/components/Partials/Pill";
import DateCol from "@/components/Tables/Columns/DateCol";
import PillCol from "@/components/Tables/Columns/PillCol";
import TextCol from "@/components/Tables/Columns/TextCol";
import { Permissions } from "@/constants/permissions";
import type useRowTarget from "@/hooks/useRowTarget";
import userStore from "@/store/userStore";
import T from "@/translations";
import type { TableRowProps } from "@/types/components";

interface EmailRowProps extends TableRowProps {
	email: Email;
	include: boolean[];
	rowTarget: ReturnType<typeof useRowTarget<"preview" | "resend" | "delete">>;
}

const EmailRow: Component<EmailRowProps> = (props) => {
	// ----------------------------------
	// Helpers
	const getPillTheme = (
		deliveryStatus: EmailDeliveryStatus,
	): PillProps["theme"] => {
		if (
			deliveryStatus === "sent" ||
			deliveryStatus === "delivered" ||
			deliveryStatus === "opened" ||
			deliveryStatus === "clicked"
		) {
			return "primary-opaque";
		}
		if (
			deliveryStatus === "failed" ||
			deliveryStatus === "bounced" ||
			deliveryStatus === "complained"
		) {
			return "error-opaque";
		}
		return "outline";
	};

	// ----------------------------------
	// Render
	return (
		<Tr
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
				},
			]}
		>
			<PillCol
				text={props.email.currentStatus}
				theme={getPillTheme(props.email.currentStatus)}
				options={{ include: props?.include[0] }}
			/>
			<TextCol
				text={props.email.mailDetails.subject}
				options={{
					include: props?.include[1],
					minWidth: 320,
					maxLines: 1,
				}}
			/>
			<TextCol
				text={props.email.mailDetails.to}
				options={{
					include: props?.include[2],
					minWidth: 240,
					maxLines: 1,
				}}
			/>
			<TextCol
				text={props.email.mailDetails.template}
				options={{
					include: props?.include[3],
					minWidth: 180,
					maxLines: 1,
				}}
			/>
			<TextCol
				text={props.email.type}
				options={{
					include: props?.include[4],
					minWidth: 120,
					classes: "capitalize",
				}}
			/>
			<TextCol
				text={props.email.mailDetails.priority}
				options={{
					include: props?.include[5],
					minWidth: 120,
					classes: "capitalize",
				}}
			/>
			<TextCol
				text={props.email.attemptCount || 0}
				options={{ include: props?.include[6], minWidth: 140 }}
			/>
			<DateCol
				date={props.email.lastAttemptedAt}
				options={{ include: props?.include[7] }}
			/>
		</Tr>
	);
};

export default EmailRow;
