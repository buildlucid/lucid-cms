import type { Email } from "@types";
import type { Component } from "solid-js";
import { Tr } from "@/components/Groups/Table";
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
	const priorityTheme = () => {
		switch (props.email.mailDetails.priority) {
			case "high":
				return "error-opaque";
			case "low":
				return "grey";
			default:
				return "outline";
		}
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
					label: T()("preview"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.email.id);
						props.rowTarget.setTrigger("preview", true);
					},
					permission: userStore.get.hasPermission([Permissions.EmailRead]).all,
				},
				{
					label: T()("resend"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.email.id);
						props.rowTarget.setTrigger("resend", true);
					},
					permission: userStore.get.hasPermission([Permissions.EmailSend]).all,
					disabled: props.email.resend.enabled !== true,
					disabledToast: {
						title: T()("resend_email_unavailable_toast_title"),
						message: T()("resend_email_unavailable_toast_message"),
						status: "warning",
					},
					actionExclude: true,
				},
				{
					label: T()("delete"),
					type: "button",
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
				theme={
					props.email.currentStatus === "sent" ||
					props.email.currentStatus === "delivered"
						? "primary-opaque"
						: props.email.currentStatus === "failed"
							? "error-opaque"
							: "outline"
				}
				options={{ include: props?.include[0] }}
			/>
			<PillCol
				text={props.email.mailDetails.priority}
				theme={priorityTheme()}
				options={{ include: props?.include[1] }}
			/>
			<TextCol
				text={props.email.mailDetails.subject}
				options={{ include: props?.include[2], maxLines: 2 }}
			/>
			<PillCol
				text={props.email.mailDetails.template}
				options={{ include: props?.include[3] }}
				theme={"outline"}
			/>
			<TextCol
				text={props.email.mailDetails.to}
				options={{ include: props?.include[4], maxLines: 1 }}
			/>
			<TextCol
				text={props.email.mailDetails.from.address}
				options={{ include: props?.include[5], maxLines: 1 }}
			/>
			<PillCol
				text={props.email.attemptCount || 0}
				theme={"outline"}
				options={{ include: props?.include[6] }}
			/>
			<PillCol
				text={props.email.type}
				theme={"outline"}
				options={{ include: props?.include[7] }}
			/>
			<DateCol
				date={props.email.createdAt}
				options={{ include: props?.include[8] }}
			/>
			<DateCol
				date={props.email.lastAttemptedAt}
				options={{ include: props?.include[9] }}
			/>
		</Tr>
	);
};

export default EmailRow;
