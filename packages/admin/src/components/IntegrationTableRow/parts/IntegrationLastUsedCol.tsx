import type { Integration } from "@types";
import { type Component, createMemo } from "solid-js";
import DateText from "@/components/DateText/DateText";
import { TableCell } from "@/components/TableCell/TableCell";

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
		<TableCell
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
		</TableCell>
	);
};

export default IntegrationLastUsedCol;
