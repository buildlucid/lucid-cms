import type { Email } from "@types";
import type { Component } from "solid-js";
import { Tr } from "@/components/Groups/Table/Tr";
import DateCol from "@/components/Tables/Columns/DateCol";
import EmailAddressesCol from "@/components/Tables/Columns/EmailAddressesCol";
import EmailMessageCol from "@/components/Tables/Columns/EmailMessageCol";
import PillCol from "@/components/Tables/Columns/PillCol";
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
			<EmailMessageCol
				email={props.email}
				options={{ include: props?.include[1] }}
			/>
			<EmailAddressesCol
				email={props.email}
				options={{ include: props?.include[2] }}
			/>
			<PillCol
				text={props.email.attemptCount || 0}
				theme={"outline"}
				options={{ include: props?.include[3] }}
			/>
			<DateCol
				date={props.email.createdAt}
				options={{ include: props?.include[4] }}
			/>
			<DateCol
				date={props.email.lastAttemptedAt}
				options={{ include: props?.include[5] }}
			/>
		</Tr>
	);
};

export default EmailRow;
