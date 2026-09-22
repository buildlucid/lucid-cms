import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import { FaSolidEye, FaSolidEyeSlash } from "solid-icons/fa";
import {
	type Component,
	createMemo,
	createSignal,
	type JSX,
	type JSXElement,
	Show,
	splitProps,
} from "solid-js";
import Field from "@/components/Field/Field";
import { FormTooltip } from "@/components/FormTooltip/FormTooltip";

export type InputType =
	| "text"
	| "color"
	| "email"
	| "password"
	| "number"
	| "url"
	| "tel"
	| "search"
	| "date"
	| "datetime-local"
	| "time";

export interface InputProps
	extends Omit<
		JSX.InputHTMLAttributes<HTMLInputElement>,
		"id" | "name" | "type" | "value" | "onChange" | "onInput" | "class"
	> {
	id: string;
	name: string;
	type: InputType;
	value: string;
	onChange: (_value: string) => void;
	label?: string;
	description?: string;
	/** Help text shown in a tooltip beside the input. */
	tooltip?: string;
	errors?: ErrorResult | FieldError;
	labelStart?: JSXElement;
	labelEnd?: JSXElement;
	/** Applied to the field. Target `[data-input-control]` for the input. */
	class?: string;
}

/**
 * A text input with a label, description and validation errors. Other input
 * attributes are passed to the `<input>`.
 *
 * @example
 * ```tsx
 * import { Input } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<Input
 * 		id="email"
 * 		name="email"
 * 		type="email"
 * 		label={t("common.email")}
 * 		value={email()}
 * 		onChange={setEmail}
 * 		required
 * 	/>
 * );
 * ```
 */
const Input: Component<InputProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [local, rest] = splitProps(props, [
		"id",
		"name",
		"type",
		"value",
		"onChange",
		"label",
		"description",
		"tooltip",
		"errors",
		"labelStart",
		"labelEnd",
		"class",
	]);
	const [passwordVisible, setPasswordVisible] = createSignal(false);

	// ----------------------------------------
	// Memos
	const inputType = createMemo(() => {
		if (local.type === "password" && passwordVisible()) return "text";
		return local.type;
	});

	// ----------------------------------------
	// Render
	return (
		<Field.Root
			id={local.id}
			required={rest.required}
			disabled={rest.disabled}
			errors={local.errors}
			class={local.class}
		>
			<Show when={local.label !== undefined || local.labelEnd !== undefined}>
				<Field.Label start={local.labelStart} end={local.labelEnd}>
					{local.label}
				</Field.Label>
			</Show>
			<div class="relative">
				<input
					{...rest}
					data-input-control
					id={local.id}
					name={local.name}
					type={inputType()}
					value={local.value}
					class={classnames(
						"w-full focus:outline-hidden px-2 text-sm text-subtitle disabled:cursor-not-allowed disabled:opacity-80 bg-input-base border border-border h-10 rounded-md focus:border-primary-base duration-200 transition-colors",
						{
							"pr-8": local.type === "password",
						},
					)}
					aria-describedby={
						local.description ? `${local.id}-description` : undefined
					}
					onInput={(event) => local.onChange(event.currentTarget.value)}
					onKeyDown={(event) => event.stopPropagation()}
				/>
				<Show when={local.type === "password"}>
					<button
						type="button"
						class="absolute right-2.5 top-1/2 -translate-y-1/2 text-primary-hover hover:text-primary-base duration-200 transition-colors"
						onClick={() => setPasswordVisible(!passwordVisible())}
						tabIndex={-1}
					>
						<Show
							when={passwordVisible()}
							fallback={<FaSolidEye size={18} class="text-unfocused" />}
						>
							<FaSolidEyeSlash size={18} class="text-unfocused" />
						</Show>
					</button>
				</Show>
			</div>
			<FormTooltip copy={local.tooltip} theme="basic" />
			<Field.Error />
			<Show when={local.description}>
				{(description) => (
					<Field.Description>{description()}</Field.Description>
				)}
			</Show>
		</Field.Root>
	);
};

export default Input;
