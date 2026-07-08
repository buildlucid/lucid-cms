import type { Component } from "solid-js";
import { Show } from "solid-js";
import { Td } from "@/components/Groups/Table/Td";

interface ColorColProps {
	value?: string | null;
	options?: {
		include?: boolean;
		padding?: "16" | "24";
		minWidth?: number;
	};
}

const ColorCol: Component<ColorColProps> = (props) => {
	const colorValue = () => props.value?.trim() || null;

	return (
		<Td
			options={{
				include: props.options?.include,
				padding: props.options?.padding,
				minWidth: props.options?.minWidth,
			}}
		>
			<Show when={colorValue()} fallback={<span class="text-sm">-</span>}>
				{(value) => (
					<div class="flex min-w-0 items-center gap-2" title={value()}>
						<span
							class="size-4 shrink-0 rounded-full border border-border shadow-xs"
							style={{ "background-color": value() }}
						/>
						<span class="min-w-0 truncate text-sm">{value()}</span>
					</div>
				)}
			</Show>
		</Td>
	);
};

export default ColorCol;
