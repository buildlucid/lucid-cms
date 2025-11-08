import type { Component } from "solid-js";
import classnames from "classnames";
import { FaSolidCheck } from "solid-icons/fa";

interface CheckboxButtonProps {
	id: string;
	value: boolean;
	onChange: (_value: boolean) => void;
	name?: string;
	copy: {
		label?: string;
	};
	disabled?: boolean;
	theme: "primary" | "error";
}

export const CheckboxButton: Component<CheckboxButtonProps> = (props) => {
	let checkboxRef: HTMLInputElement | undefined;

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
			<button
				type="button"
				class={classnames(
					"flex max-w-max items-center gap-2 h-9 px-2 text-sm rounded-md relative disabled:cursor-not-allowed disabled:opacity-50 focus:outline-hidden ring-1 ring-border focus-visible:ring-1 ring-inset focus:ring-primary-base group duration-200 transition-colors",
					{
						"bg-input-base text-title hover:bg-secondary-hover hover:text-secondary-contrast":
							!props.value,
						"bg-primary-base hover:bg-primary-hover text-primary-contrast":
							props.value && props.theme === "primary",
						"bg-error-base hover:bg-error-hover text-error-contrast":
							props.value && props.theme === "error",
					},
				)}
				onClick={() => {
					checkboxRef?.click();
				}}
				aria-pressed={props.value}
				disabled={props.disabled}
			>
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
				{props.copy.label}
			</button>
		</>
	);
};
