import type { ApiIntegration } from "@types";
import { type Component, createMemo } from "solid-js";
import { Td } from "@/components/Groups/Table/Td";
import DateText from "@/components/Partials/DateText";

interface ApiIntegrationLastUsedColProps {
	apiIntegration: ApiIntegration;
	options?: {
		include?: boolean;
		padding?: "16" | "24";
	};
}

const ApiIntegrationLastUsedCol: Component<ApiIntegrationLastUsedColProps> = (
	props,
) => {
	// ----------------------------------------
	// Memos
	const meta = createMemo(
		() =>
			`IP ${props.apiIntegration.lastUsedIp ?? "-"} / Agent ${
				props.apiIntegration.lastUsedUserAgent ?? "-"
			}`,
	);

	// ----------------------------------------
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
				<DateText date={props.apiIntegration.lastUsedAt} />
				<span class="truncate text-xs text-body" title={meta()}>
					{meta()}
				</span>
			</div>
		</Td>
	);
};

export default ApiIntegrationLastUsedCol;
