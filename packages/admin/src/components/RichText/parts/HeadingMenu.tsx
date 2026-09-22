import classNames from "classnames";
import { FaSolidChevronDown } from "solid-icons/fa";
import { type Component, createMemo, For } from "solid-js";
import Menu from "@/components/Menu/Menu";

export interface HeadingOption {
	value: number;
	label: string;
}

const HeadingMenu: Component<{
	mode: "toolbar" | "pill";
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
		<Menu.Root
			open={isPillMenu() ? props.open : undefined}
			onOpenChange={(open) => {
				if (!isPillMenu()) return;
				props.onOpenChange?.(open);
			}}
		>
			<Menu.Trigger
				class={classNames(
					"inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs transition-colors duration-150 outline-none focus-visible:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
					{
						"bg-primary-low text-primary-low-foreground border-primary-low-border":
							props.mode === "toolbar" || props.activeHeading > 0,
						"text-body hover:bg-background-hover hover:text-title border-transparent":
							props.mode === "pill" && props.activeHeading === 0,
					},
				)}
				onMouseDown={(e) => e.preventDefault()}
				disabled={props.disabled}
				title={activeLabel()}
			>
				<span class="font-medium">Aa</span>
				<FaSolidChevronDown size={10} />
			</Menu.Trigger>
			<Menu.Content>
				<For each={props.options}>
					{(option) => (
						<Menu.Item
							selected={props.activeHeading === option.value}
							onSelect={() => props.onSetHeading(option.value)}
						>
							{option.label}
						</Menu.Item>
					)}
				</For>
			</Menu.Content>
		</Menu.Root>
	);
};

export default HeadingMenu;
