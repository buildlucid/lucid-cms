import { DropdownMenu } from "@kobalte/core";
import classNames from "classnames";
import { FaSolidChevronDown } from "solid-icons/fa";
import { type Component, createMemo, For } from "solid-js";
import DropdownContent from "@/components/Partials/DropdownContent";

export interface HeadingOption {
	value: number;
	label: string;
}

const HeadingMenu: Component<{
	mode: "mobile" | "pill";
	disabled?: boolean;
	activeHeading: number;
	options: HeadingOption[];
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	onSetHeading: (level: number) => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const isPillMenu = createMemo(() => props.mode === "pill");
	const activeLabel = createMemo(
		() =>
			props.options.find((option) => option.value === props.activeHeading)
				?.label,
	);

	// ----------------------------------------
	// Render
	return (
		<DropdownMenu.Root
			open={isPillMenu() ? props.open : undefined}
			onOpenChange={(open) => {
				if (!isPillMenu()) return;
				props.onOpenChange?.(open);
			}}
		>
			<DropdownMenu.Trigger
				class={classNames(
					"inline-flex items-center gap-1 rounded-md text-xs transition-colors duration-150 outline-none focus-visible:ring-1 focus:ring-primary-base disabled:opacity-50 disabled:cursor-not-allowed border",
					{
						"h-7 bg-input-base px-2 text-title border-border":
							props.mode === "mobile",
						"h-7 px-2": props.mode === "pill",
						"bg-primary-muted-bg text-primary-base border-primary-muted-border":
							props.activeHeading > 0,
						"text-body hover:bg-background-hover hover:text-title border-transparent":
							props.mode === "pill" && props.activeHeading === 0,
					},
				)}
				onMouseDown={(e) => e.preventDefault()}
				disabled={props.disabled}
				title={activeLabel()}
			>
				<span class="font-medium">Aa</span>
				<DropdownMenu.Icon>
					<FaSolidChevronDown size={10} />
				</DropdownMenu.Icon>
			</DropdownMenu.Trigger>
			<DropdownContent
				options={{
					rounded: true,
					class: "w-40 p-1.5! z-60",
				}}
			>
				<ul class="flex flex-col gap-y-0.5">
					<For each={props.options}>
						{(option) => (
							<li>
								<DropdownMenu.Item
									class={classNames(
										"px-2 py-1 text-sm rounded-md cursor-pointer outline-none focus-visible:ring-1 focus:ring-primary-base transition-colors hover:bg-dropdown-hover hover:text-dropdown-contrast",
										{
											"bg-dropdown-hover text-dropdown-contrast":
												props.activeHeading === option.value,
										},
									)}
									onSelect={() => props.onSetHeading(option.value)}
								>
									{option.label}
								</DropdownMenu.Item>
							</li>
						)}
					</For>
				</ul>
			</DropdownContent>
		</DropdownMenu.Root>
	);
};

export default HeadingMenu;
