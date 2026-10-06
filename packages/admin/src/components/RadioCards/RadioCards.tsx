import { RadioGroup } from "@kobalte/core";
import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import { For, Show } from "solid-js";
import Field from "@/components/Field/Field";
import { FormTooltip } from "@/components/FormTooltip/FormTooltip";

export interface RadioCardOption<T extends string> {
	value: T;
	label: string;
	description?: string;
}

export interface RadioCardsProps<T extends string> {
	id: string;
	name?: string;
	value: T;
	onChange: (_value: T) => void;
	options: RadioCardOption<T>[];
	label?: string;
	/** Help text shown in a tooltip beside the label. */
	tooltip?: string;
	/** @default 1 */
	columns?: 1 | 2;
	errors?: ErrorResult | FieldError;
	required?: boolean;
	disabled?: boolean;
	class?: string;
}

/**
 * A choice between a few options, shown as cards so each one can explain itself.
 *
 * @example
 * ```tsx
 * import { RadioCards } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<RadioCards
 * 		id="layout"
 * 		label={t("layout")}
 * 		value={layout()}
 * 		onChange={setLayout}
 * 		columns={2}
 * 		options={[
 * 			{ value: "grid", label: t("grid"), description: t("grid.description") },
 * 			{ value: "list", label: t("list"), description: t("list.description") },
 * 		]}
 * 	/>
 * );
 * ```
 */
const RadioCards = <T extends string>(props: RadioCardsProps<T>) => {
	// ----------------------------------------
	// Functions
	const onChange = (value: string) => {
		const option = props.options.find((option) => option.value === value);
		if (option) props.onChange(option.value);
	};

	// ----------------------------------------
	// Render
	return (
		<Field.Root
			id={props.id}
			required={props.required}
			disabled={props.disabled}
			errors={props.errors}
			class={props.class}
		>
			<Show when={props.label !== undefined}>
				<Field.Label
					end={
						props.tooltip ? (
							<FormTooltip copy={props.tooltip} theme="inline" />
						) : undefined
					}
				>
					{props.label}
				</Field.Label>
			</Show>
			<RadioGroup.Root
				id={props.id}
				name={props.name}
				value={props.value}
				onChange={onChange}
				required={props.required}
				disabled={props.disabled}
				validationState={props.errors ? "invalid" : "valid"}
				aria-label={props.label}
				class={classnames("grid gap-2", {
					"md:grid-cols-2": props.columns === 2,
				})}
			>
				<For each={props.options}>
					{(option) => (
						<RadioGroup.Item
							as="label"
							value={option.value}
							class="group/card relative flex cursor-pointer items-start gap-3 rounded-md border border-border bg-input p-3 transition-colors duration-200 hover:bg-card-hover has-[input:focus-visible]:border-primary data-checked:border-primary data-checked:ring-1 data-checked:ring-primary-low-border data-disabled:cursor-not-allowed data-disabled:opacity-60 data-invalid:border-danger-low-border"
						>
							<RadioGroup.ItemInput />
							<RadioGroup.ItemControl class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-border bg-input group-data-checked/card:border-primary">
								<RadioGroup.ItemIndicator class="size-2 rounded-full bg-primary" />
							</RadioGroup.ItemControl>
							<span class="min-w-0 grow">
								<RadioGroup.ItemLabel
									as="span"
									class="block text-sm text-title"
								>
									{option.label}
								</RadioGroup.ItemLabel>
								<Show when={option.description}>
									<RadioGroup.ItemDescription
										as="span"
										class="mt-0.5 block text-xs text-subtitle"
									>
										{option.description}
									</RadioGroup.ItemDescription>
								</Show>
							</span>
						</RadioGroup.Item>
					)}
				</For>
			</RadioGroup.Root>
			<Field.Error />
		</Field.Root>
	);
};

export default RadioCards;
