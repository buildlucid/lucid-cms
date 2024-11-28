import T from "@/translations";
import type { Component } from "solid-js";
import type useRowTarget from "@/hooks/useRowTarget";
import type { TableRowProps } from "@/types/components";
import type { EmailResponse } from "@types";
import userStore from "@/store/userStore";
import { Tr } from "@/components/Groups/Table";
import TextCol from "@/components/Tables/Columns/TextCol";
import DateCol from "@/components/Tables/Columns/DateCol";
import PillCol from "@/components/Tables/Columns/PillCol";

interface EmailRowProps extends TableRowProps {
	email: EmailResponse;
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
					label: T()("preview"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.email.id);
						props.rowTarget.setTrigger("preview", true);
					},
					permission: userStore.get.hasPermission(["read_email"]).all,
				},
				{
					label: T()("resend"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.email.id);
						props.rowTarget.setTrigger("resend", true);
					},
					permission: userStore.get.hasPermission(["send_email"]).all,
					actionExclude: true,
				},
				{
					label: T()("delete"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.email.id);
						props.rowTarget.setTrigger("delete", true);
					},
					permission: userStore.get.hasPermission(["delete_email"]).all,
					actionExclude: true,
				},
			]}
		>
			<PillCol
				text={props.email.deliveryStatus}
				theme={
					props.email.deliveryStatus === "sent"
						? "primary"
						: props.email.deliveryStatus === "failed"
							? "red"
							: "grey"
				}
				options={{ include: props?.include[0] }}
			/>
			<TextCol
				text={props.email.mailDetails.subject}
				options={{ include: props?.include[1], maxLines: 2 }}
			/>
			<PillCol
				text={props.email.mailDetails.template}
				options={{ include: props?.include[2] }}
			/>
			<TextCol
				text={props.email.mailDetails.to}
				options={{ include: props?.include[3], maxLines: 1 }}
			/>
			<TextCol
				text={props.email.mailDetails.from.address}
				options={{ include: props?.include[4], maxLines: 1 }}
			/>
			<PillCol
				text={props.email.sentCount || 0}
				theme={"primary"}
				options={{ include: props?.include[5] }}
			/>
			<PillCol
				text={props.email.errorCount || 0}
				theme={"red"}
				options={{ include: props?.include[6] }}
			/>
			<PillCol
				text={props.email.type}
				theme={"grey"}
				options={{ include: props?.include[7] }}
			/>
			<DateCol
				date={props.email.createdAt}
				options={{ include: props?.include[8] }}
			/>
			<DateCol
				date={props.email.lastAttemptAt}
				options={{ include: props?.include[9] }}
			/>
			<DateCol
				date={props.email.lastSuccessAt}
				options={{ include: props?.include[10] }}
			/>
		</Tr>
	);
};

export default EmailRow;
