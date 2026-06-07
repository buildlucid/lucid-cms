import type { Email } from "@types";
import type { Component } from "solid-js";
import { Td } from "@/components/Groups/Table/Td";

interface EmailMessageColProps {
	email: Email;
	options?: {
		include?: boolean;
		padding?: "16" | "24";
	};
}

const EmailMessageCol: Component<EmailMessageColProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Td
			options={{
				include: props.options?.include,
				padding: props.options?.padding,
				minWidth: 260,
			}}
		>
			<div class="flex min-w-0 flex-col gap-1">
				<span
					class="line-clamp-1 text-sm text-title"
					title={props.email.mailDetails.subject}
				>
					{props.email.mailDetails.subject || "-"}
				</span>
				<span class="truncate text-xs text-body">
					{props.email.mailDetails.template || "-"} / {props.email.type} /{" "}
					{props.email.mailDetails.priority}
				</span>
			</div>
		</Td>
	);
};

export default EmailMessageCol;
