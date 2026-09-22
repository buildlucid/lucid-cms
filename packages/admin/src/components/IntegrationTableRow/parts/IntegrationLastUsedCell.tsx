import type { Integration } from "@types";
import { type Component, createMemo } from "solid-js";
import DateText from "@/components/DateText/DateText";
import Table from "@/components/Table/Table";

interface IntegrationLastUsedCellProps {
	column?: string;
	integration: Integration;
}

const IntegrationLastUsedCell: Component<IntegrationLastUsedCellProps> = (
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
		<Table.Cell column={props.column} minWidth={280}>
			<div class="flex min-w-0 flex-col gap-1">
				<DateText date={props.integration.lastUsedAt} />
				<span class="truncate text-xs text-body" title={meta()}>
					{meta()}
				</span>
			</div>
		</Table.Cell>
	);
};

export default IntegrationLastUsedCell;
