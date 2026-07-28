import type { Integration } from "@types";
import { type Component, createMemo } from "solid-js";
import { Td } from "@/components/Groups/Table/Td";
import DateText from "@/components/Partials/DateText";

interface IntegrationLastUsedColProps {
	integration: Integration;
	options?: {
		include?: boolean;
		padding?: "16" | "24";
	};
}

const IntegrationLastUsedCol: Component<IntegrationLastUsedColProps> = (
	props,
) => {
	// ----------------------------------------
	// Memos
	const meta = createMemo(
		() =>
			`IP ${props.integration.lastUsedIp ?? "-"} / Agent ${
				props.integration.lastUsedUserAgent ?? "-"
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
				<DateText date={props.integration.lastUsedAt} />
				<span class="truncate text-xs text-body" title={meta()}>
					{meta()}
				</span>
			</div>
		</Td>
	);
};

export default IntegrationLastUsedCol;
