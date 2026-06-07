import type { Email } from "@types";
import { type Component, createMemo } from "solid-js";
import { Td } from "@/components/Groups/Table/Td";
import T from "@/translations";

interface EmailAddressesColProps {
	email: Email;
	options?: {
		include?: boolean;
		padding?: "16" | "24";
	};
}

const EmailAddressesCol: Component<EmailAddressesColProps> = (props) => {
	// ----------------------------------
	// Memos
	const from = createMemo(() => {
		if (props.email.mailDetails.from.name) {
			return `${props.email.mailDetails.from.name} <${props.email.mailDetails.from.address}>`;
		}
		return props.email.mailDetails.from.address;
	});

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
				<div class="flex min-w-0 items-center gap-1.5 text-sm">
					<span class="shrink-0 text-body">{T()("common.to")}</span>
					<span class="truncate text-title" title={props.email.mailDetails.to}>
						{props.email.mailDetails.to || "-"}
					</span>
				</div>
				<div class="flex min-w-0 items-center gap-1.5 text-xs">
					<span class="shrink-0 text-body">{T()("common.from")}</span>
					<span class="truncate text-body" title={from()}>
						{from() || "-"}
					</span>
				</div>
			</div>
		</Td>
	);
};

export default EmailAddressesCol;
