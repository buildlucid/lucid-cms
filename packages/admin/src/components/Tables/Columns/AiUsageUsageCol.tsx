import type { AiUsage } from "@types";
import { type Component, For } from "solid-js";
import { Td } from "@/components/Groups/Table/Td";
import T from "@/translations";
import { formatAiUsageNumber } from "@/utils/ai-usage";

interface AiUsageUsageColProps {
	aiUsage: AiUsage;
	options?: {
		include?: boolean;
		padding?: "16" | "24";
	};
}

const AiUsageUsageCol: Component<AiUsageUsageColProps> = (props) => {
	const tokenRows = () => [
		{
			label: T()("ai.usage.tokens.input.short"),
			value: formatAiUsageNumber(props.aiUsage.tokens?.input),
		},
		{
			label: T()("ai.usage.tokens.output.short"),
			value: formatAiUsageNumber(props.aiUsage.tokens?.output),
		},
		{
			label: T()("ai.usage.tokens.total.short"),
			value: formatAiUsageNumber(props.aiUsage.tokens?.total),
		},
	];

	// ----------------------------------
	// Render
	return (
		<Td
			options={{
				include: props.options?.include,
				padding: props.options?.padding,
				minWidth: 240,
			}}
		>
			<div class="flex flex-col gap-1.5">
				<span
					class="text-sm text-title line-clamp-1"
					title={props.aiUsage.model ?? "-"}
				>
					{props.aiUsage.model ?? "-"}
				</span>
				<div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-body">
					<For each={tokenRows()}>
						{(row) => (
							<span>
								<span class="text-body">{row.label}</span>{" "}
								<span class="text-title">{row.value ?? "-"}</span>
							</span>
						)}
					</For>
				</div>
			</div>
		</Td>
	);
};

export default AiUsageUsageCol;
