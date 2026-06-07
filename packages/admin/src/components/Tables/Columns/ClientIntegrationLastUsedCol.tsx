import type { ClientIntegration } from "@types";
import { type Component, createMemo } from "solid-js";
import { Td } from "@/components/Groups/Table/Td";
import DateText from "@/components/Partials/DateText";

interface ClientIntegrationLastUsedColProps {
	clientIntegration: ClientIntegration;
	options?: {
		include?: boolean;
		padding?: "16" | "24";
	};
}

const ClientIntegrationLastUsedCol: Component<
	ClientIntegrationLastUsedColProps
> = (props) => {
	// ----------------------------------
	// Memos
	const meta = createMemo(
		() =>
			`IP ${props.clientIntegration.lastUsedIp ?? "-"} / Agent ${
				props.clientIntegration.lastUsedUserAgent ?? "-"
			}`,
	);

	// ----------------------------------
	// Render
	return (
		<Td
			options={{
				include: props.options?.include,
				padding: props.options?.padding,
				minWidth: 280,
			}}
		>
			<div class="flex min-w-0 flex-col gap-1">
				<DateText date={props.clientIntegration.lastUsedAt} />
				<span class="truncate text-xs text-body" title={meta()}>
					{meta()}
				</span>
			</div>
		</Td>
	);
};

export default ClientIntegrationLastUsedCol;
