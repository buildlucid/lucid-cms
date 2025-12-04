import { Checkbox } from "@kobalte/core";
import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import { FaSolidCheck } from "solid-icons/fa";
import { type Component, createSignal } from "solid-js";
import { DescribedBy, ErrorMessage, Tooltip } from "@/components/Groups/Form";

interface CheckboxInputProps {
	id?: string;
	value: boolean;
	onChange: (_value: boolean) => void;
	name?: string;
	copy: {
		label?: string;
		describedBy?: string;
		tooltip?: string;
	};
	required?: boolean;
	errors?: ErrorResult | FieldError;
	noMargin?: boolean;
	class?: string;
	fullWidth?: boolean;
}

export const CheckboxInput: Component<CheckboxInputProps> = (props) => {
	const [inputFocus, setInputFocus] = createSignal(false);

	// ----------------------------------------
	// Render
	return (
		<div
			class={classnames("relative", props.class, {
				"mb-3 last:mb-0": props.noMargin !== true,
				"w-full": props.fullWidth !== false,
			})}
		>
			<div class="flex items-center justify-between">
				<Checkbox.Root
					class="flex items-center"
					required={props.required}
					name={props.name}
					checked={props.value}
					onChange={props.onChange}
					id={props.id}
				>
					<Checkbox.Input
						onFocus={() => setInputFocus(true)}
						onBlur={() => setInputFocus(false)}
					/>
					<Checkbox.Control
						onClick={(e) => {
							e.stopPropagation();
						}}
						class={classnames(
							"h-5 w-5 min-w-[20px] text-primary-contrast rounded-md border-border border cursor-pointer hover:border-primary-base bg-input-base data-checked:bg-primary-base data-checked:border-primary-hover data-checked:fill-primary-contrast transition-colors duration-200",
							{
								"border-primary-base": inputFocus(),
							},
						)}
					>
						<Checkbox.Indicator class="w-full h-full relative">
							<div class="absolute inset-0 flex justify-center items-center">
								<FaSolidCheck size={10} />
							</div>
						</Checkbox.Indicator>
					</Checkbox.Control>
					{props.copy.label && (
						<Checkbox.Label
							class={classnames(
								"text-sm transition-colors duration-200 ease-in-out ml-2.5",
								{
									"text-primary-hover": inputFocus(),
								},
							)}
						>
							{props.copy.label}
						</Checkbox.Label>
					)}
				</Checkbox.Root>
				<Tooltip copy={props.copy?.tooltip} theme={"inline"} />
			</div>
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};
