import classnames from "classnames";
import { FaSolidChevronDown } from "solid-icons/fa";
import { type Component, For } from "solid-js";
import Button, {
	type ButtonSize,
	type ButtonVariant,
} from "@/components/Button/Button";
import { getButtonClasses } from "@/components/Button/classes";
import Menu, { type MenuItemVariant } from "@/components/Menu/Menu";
import T from "@/translations";

export interface SplitButtonAction {
	label: string;
	onSelect: () => void;
	variant?: MenuItemVariant;
	disabled?: boolean;
}

export interface SplitButtonProps {
	label: string;
	onClick: () => void;
	actions: SplitButtonAction[];
	/** @default "primary" */
	variant?: ButtonVariant;
	/** @default "md" */
	size?: ButtonSize;
	loading?: boolean;
	disabled?: boolean;
}

const SplitButton: Component<SplitButtonProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div data-split-button class="flex items-center">
			<Button
				variant={props.variant}
				size={props.size}
				loading={props.loading}
				disabled={props.disabled}
				onClick={props.onClick}
				class="rounded-e-none"
			>
				{props.label}
			</Button>
			<Menu.Root placement="bottom-end">
				<Menu.Trigger
					disabled={props.disabled || props.loading}
					class={classnames(
						getButtonClasses({
							variant: props.variant ?? "primary",
							size: props.size ?? "md",
							shape: "square",
						}),
						"rounded-s-none border-s border-black/10",
					)}
				>
					<span class="sr-only">{T()("common.options")}</span>
					<FaSolidChevronDown size={10} />
				</Menu.Trigger>
				<Menu.Content>
					<For each={props.actions}>
						{(action) => (
							<Menu.Item
								variant={action.variant}
								disabled={action.disabled}
								onSelect={action.onSelect}
							>
								{action.label}
							</Menu.Item>
						)}
					</For>
				</Menu.Content>
			</Menu.Root>
		</div>
	);
};

export default SplitButton;
