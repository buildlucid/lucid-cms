import {
	type Component,
	For,
	Match,
	Show,
	Switch,
	type JSXElement,
} from "solid-js";
import classNames from "classnames";
import Pill from "@/components/Partials/Pill";

interface DetailsListProps {
	type: "text" | "pill";
	items: Array<{
		label: string;
		value?: string | number | null | JSXElement;
		show?: boolean;
		stacked?: boolean;
	}>;
	theme?: "contained";
}

const DetailsList: Component<DetailsListProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<ul
			class={classNames("w-full bg-card-base", {
				"mb-6 last:mb-0 border border-border rounded-md p-4":
					props.theme !== "contained",
			})}
		>
			<For each={props.items}>
				{(item) => (
					<Show when={item.show !== false}>
						<li
							class={classNames(
								"flex mb-2 last:mb-0 gap-x-2 border-b border-border pb-2 last:pb-0 last:border-b-0",
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
									<span class="font-medium text-title text-sm">
										{item.label}
									</span>
									<Show when={item.value !== undefined}>
										<Pill theme="primary">{item.value}</Pill>
									</Show>
								</Match>
								<Match when={props.type === "text"}>
									<span class="font-medium text-title text-sm">
										{item.label}
									</span>
									<Show when={item.value !== undefined}>
										<span class="font-medium text-unfocused text-sm">
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
