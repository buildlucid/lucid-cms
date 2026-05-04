import { HoverCard } from "@kobalte/core";
import classnames from "classnames";
import { FaSolidCheck } from "solid-icons/fa";
import { type Component, Show } from "solid-js";

interface CheckboxButtonProps {
	id: string;
	value: boolean;
	onChange: (_value: boolean) => void;
	name?: string;
	copy: {
		label?: string;
		tooltip?: string;
	};
	disabled?: boolean;
	theme: "primary" | "secondary" | "error";
}

export const CheckboxButton: Component<CheckboxButtonProps> = (props) => {
	let checkboxRef: HTMLInputElement | undefined;

	const buttonClass = () =>
		classnames(
			"flex max-w-max items-center gap-2 h-9 pl-2 pr-3 text-sm rounded-md relative disabled:cursor-not-allowed disabled:opacity-50 focus:outline-hidden ring-1 ring-border focus-visible:ring-1 ring-inset focus-visible:ring-primary-base group duration-200 transition-colors",
			{
				"cursor-not-allowed opacity-50": props.disabled,
				"bg-input-base text-subtitle hover:bg-secondary-hover hover:text-secondary-contrast":
					!props.value,
				"bg-primary-base hover:bg-primary-hover text-primary-contrast":
					props.value && props.theme === "primary",
				"bg-secondary-base hover:bg-secondary-hover text-secondary-contrast":
					props.value && props.theme === "secondary",
				"bg-error-base hover:bg-error-hover text-error-contrast":
					props.value && props.theme === "error",
			},
		);
	const onButtonClick = () => {
		if (props.disabled) return;
		checkboxRef?.click();
	};
	const ButtonContent = () => (
		<>
			<span
				class={classnames(
					"rounded-sm size-4 border inline-flex items-center justify-center transition-colors duration-200",
					{
						"border-border bg-background-base group-hover:bg-background-base/20":
							!props.value,
						"bg-card-base border-card-base text-card-contrast": props.value,
					},
				)}
			>
				<FaSolidCheck
					size={10}
					class={classnames("fill-current", {
						hidden: !props.value,
					})}
				/>
			</span>
			<span>{props.copy.label}</span>
		</>
	);

	// -----------------------------------
	// Render
	return (
		<>
			<input
				ref={checkboxRef}
				type="checkbox"
				id={props.id}
				name={props.name}
				checked={props.value}
				onChange={(e) => {
					props.onChange(e.currentTarget.checked);
				}}
				class="hidden"
				disabled={props.disabled}
			/>
			<Show
				when={props.copy.tooltip}
				fallback={
					<button
						type="button"
						class={buttonClass()}
						onClick={onButtonClick}
						aria-pressed={props.value}
						aria-disabled={props.disabled}
					>
						<ButtonContent />
					</button>
				}
			>
				{(tooltip) => (
					<HoverCard.Root>
						<HoverCard.Trigger
							as="button"
							type="button"
							class={buttonClass()}
							onClick={onButtonClick}
							aria-pressed={props.value}
							aria-disabled={props.disabled}
						>
							<ButtonContent />
						</HoverCard.Trigger>
						<HoverCard.Portal>
							<HoverCard.Content class="z-50 bg-card-base w-80 mt-2 rounded-md p-3 border border-border shadow-xs">
								<p class="text-sm text-card-contrast">{tooltip()}</p>
							</HoverCard.Content>
						</HoverCard.Portal>
					</HoverCard.Root>
				)}
			</Show>
		</>
	);
};
