import classNames from "classnames";
import {
	type Component,
	For,
	type JSXElement,
	Match,
	Show,
	Switch,
} from "solid-js";
import Pill, { type PillProps } from "@/components/Partials/Pill";

export interface DetailsListProps {
	type: "text" | "pill";
	padding?: 12 | 16;
	items: Array<{
		label: string;
		value?: string | number | null | JSXElement;
		pillTheme?: PillProps["theme"];
		pillSize?: PillProps["size"];
		show?: boolean;
		stacked?: boolean;
		wrap?: boolean;
	}>;
	theme?: "contained";
}

const DetailsList: Component<DetailsListProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<ul
			class={classNames("w-full", {
				"bg-card-base": props.theme !== "contained",
				"mb-6 last:mb-0 border border-border rounded-md":
					props.theme !== "contained",
				"p-3": props.padding === 12,
				"p-4": props.theme !== "contained" && props.padding !== 12,
			})}
		>
			<For each={props.items}>
				{(item) => (
					<Show when={item.show !== false}>
						<li
							class={classNames(
								"flex mb-2 last:mb-0 gap-x-2 gap-y-1 border-b border-border pb-2 last:pb-0 last:border-b-0",
								{
									"flex-col items-start lg:justify-between":
										props.type === "text",
									"justify-between items-center": props.type === "pill",
									"lg:flex-row lg:items-center": !item.stacked,
								},
							)}
						>
							<Switch>
								<Match when={props.type === "pill"}>
									<span class="font-medium text-subtitle text-sm">
										{item.label}
									</span>
									<Show when={item.value !== undefined}>
										<Pill
											theme={item.pillTheme ?? "primary"}
											size={item.pillSize}
										>
											{item.value}
										</Pill>
									</Show>
								</Match>
								<Match when={props.type === "text"}>
									<span class="font-medium text-subtitle text-sm">
										{item.label}
									</span>
									<Show when={item.value !== undefined}>
										<span
											class={classNames("font-medium text-unfocused text-sm", {
												"min-w-0 break-all text-left lg:text-right": item.wrap,
											})}
										>
											{item.value}
										</span>
									</Show>
								</Match>
							</Switch>
						</li>
					</Show>
				)}
			</For>
		</ul>
	);
};

export default DetailsList;
