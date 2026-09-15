import { Checkbox as KobalteCheckbox } from "@kobalte/core";
import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import { FaSolidCheck } from "solid-icons/fa";
import { type Component, createSignal } from "solid-js";
import { FieldDescription } from "@/components/FieldDescription/FieldDescription";
import { FormErrorMessage } from "@/components/FormErrorMessage/FormErrorMessage";
import { FormTooltip } from "@/components/FormTooltip/FormTooltip";

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

export const Checkbox: Component<CheckboxInputProps> = (props) => {
	const [inputFocus, setInputFocus] = createSignal(false);

	// ----------------------------------------
	// Render
	return (
		<div
			class={classnames("relative", props.class, {
				"mb-3 last:mb-0 mt-4": props.noMargin !== true,
				"w-full": props.fullWidth !== false,
			})}
		>
			<div class="flex items-center justify-between">
				<KobalteCheckbox.Root
					class="flex items-center gap-2.5"
					required={props.required}
					name={props.name}
					checked={props.value}
					onChange={props.onChange}
					id={props.id}
				>
					<KobalteCheckbox.Input
						onFocus={() => setInputFocus(true)}
						onBlur={() => setInputFocus(false)}
					/>
					<KobalteCheckbox.Control
						onClick={(e) => {
							e.stopPropagation();
						}}
						class={classnames(
							"h-5 w-5 min-w-5 text-secondary-contrast rounded-md border-border border cursor-pointer hover:border-secondary-base bg-input-base data-checked:bg-secondary-base data-checked:border-secondary-hover data-checked:fill-secondary-contrast transition-colors duration-200",
							{
								"border-primary-base": inputFocus(),
							},
						)}
					>
						<KobalteCheckbox.Indicator class="w-full h-full relative">
							<div class="absolute inset-0 flex justify-center items-center">
								<FaSolidCheck size={10} />
							</div>
						</KobalteCheckbox.Indicator>
					</KobalteCheckbox.Control>
					{props.copy.label && (
						<KobalteCheckbox.Label
							class={classnames(
								"text-sm transition-colors duration-200 ease-in-out text-body",
								{
									"text-primary-hover": inputFocus(),
								},
							)}
						>
							{props.copy.label}
						</KobalteCheckbox.Label>
					)}
				</KobalteCheckbox.Root>
				<FormTooltip copy={props.copy?.tooltip} theme={"inline"} />
			</div>
			<FieldDescription id={props.id} describedBy={props.copy?.describedBy} />
			<FormErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};
