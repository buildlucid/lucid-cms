import { type Component, createSignal, For, Show } from "solid-js";
import classnames from "classnames";
import type { ErrorResult, FieldError } from "@types";
import { ErrorMessage, Label, DescribedBy } from "@/components/Groups/Form";

export const Color: Component<{
	id: string;
	value: string;
	onChange: (_value: string) => void;
	name: string;
	copy?: {
		label?: string;
		describedBy?: string;
	};
	presets?: string[];
	required?: boolean;
	disabled?: boolean;
	errors?: ErrorResult | FieldError;
	localised?: boolean;
	altLocaleError?: boolean;
	fieldColumnIsMissing?: boolean;
}> = (props) => {
	// ----------------------------------------
	// State
	const [inputFocus, setInputFocus] = createSignal(false);
	let hiddenColorInputRef: HTMLInputElement;

	// ----------------------------------------
	// Functions
	const handleInputChange = (value: string) => {
		props.onChange(value);
	};
	const handleButtonClick = (value: string) => {
		props.onChange(value);
	};

	// ----------------------------------------
	// Render
	return (
		<div
			class={classnames(
				"mb-3 last:mb-0 flex flex-col transition-colors duration-200 ease-in-out relative w-full",
			)}
		>
			<div class="flex-1 min-w-0">
				<Label
					id={props.id}
					label={props.copy?.label}
					focused={inputFocus()}
					required={props.required}
					theme={"basic"}
					altLocaleError={props.altLocaleError}
					localised={props.localised}
					fieldColumnIsMissing={props.fieldColumnIsMissing}
				/>
				<div class="relative">
					<div
						class="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded border border-border cursor-pointer"
						style={{ "background-color": props.value }}
						onClick={() => hiddenColorInputRef?.click()}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								hiddenColorInputRef?.click();
							}
						}}
						role="button"
						tabIndex={0}
						title="Open color picker"
						aria-label="Open color picker"
					/>
					<input
						ref={(el) => {
							hiddenColorInputRef = el;
						}}
						type="color"
						class="sr-only"
						value={props.value}
						onInput={(e) => handleInputChange(e.currentTarget.value)}
						disabled={props.disabled}
						tabIndex={-1}
						aria-hidden="true"
					/>
					<input
						class={classnames(
							"focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-80 text-sm text-title font-medium pl-10 pr-3 py-2 bg-input-base border border-border h-10 w-full rounded-md focus:border-primary-base duration-200 transition-colors",
						)}
						onKeyDown={(e) => {
							e.stopPropagation();
						}}
						id={props.id}
						type={"text"}
						value={props.value}
						onInput={(e) => handleInputChange(e.currentTarget.value)}
						aria-describedby={
							props.copy?.describedBy ? `${props.id}-description` : undefined
						}
						required={props.required}
						disabled={props.disabled}
						onFocus={() => setInputFocus(true)}
						onBlur={() => {
							setInputFocus(false);
						}}
					/>
				</div>
				<Show when={(props.presets?.length ?? 0) > 0}>
					<div class="flex items-center gap-2 mt-2">
						<div class="overflow-x-auto hide-scrollbar">
							<ul class="flex flex-nowrap items-center gap-1">
								<For each={props.presets}>
									{(preset) => (
										<li class="flex-shrink-0">
											<button
												class="focus:outline-hidden focus-visible:ring-1 focus:ring-primary-base focus:ring-opacity-50 rounded-md h-7 w-7 border border-border block"
												style={{ "background-color": preset }}
												onClick={() => handleButtonClick(preset)}
												type="button"
												title={preset}
												aria-label={`Preset color ${preset}`}
											/>
										</li>
									)}
								</For>
							</ul>
						</div>
					</div>
				</Show>
			</div>
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};
