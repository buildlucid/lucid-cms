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
import { FieldFeedback } from "@/components/FieldFeedback/FieldFeedback";
import { FormLabel } from "@/components/FormLabel/FormLabel";
import { FormTooltip } from "@/components/FormTooltip/FormTooltip";

/** The text-like input types this component styles. */
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
	/** Sits under the control, and is read out alongside it. */
	description?: string;
	/** Adds a hover card next to the control. */
	tooltip?: string;
	errors?: ErrorResult | FieldError;
	/** Before the label text, for an icon or badge. */
	labelStart?: JSXElement;
	/** After the label, against the right edge. */
	labelEnd?: JSXElement;
	/** Applied to the field. Target [data-input-control] for the input itself. */
	class?: string;
}

/**
 * A labelled text input, with its description and any validation errors.
 * Password inputs get a reveal toggle. Every other input attribute, such as
 * placeholder, required, min or autocomplete, passes through to the element.
 *
 * @example
 * ```tsx
 * import { Input } from "@lucidcms/admin/components";
 *
 * return (
 * 	<Input
 * 		id="email"
 * 		name="email"
 * 		type="email"
 * 		label="Email"
 * 		value={email()}
 * 		onChange={setEmail}
 * 		required
 * 		errors={getBodyError("email", update.errors)}
 * 	/>
 * );
 * ```
 */
export const Input: Component<InputProps> = (props) => {
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
	const [focused, setFocused] = createSignal(false);
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
		<div
			data-input
			class={classnames("group w-full relative", local.class)}
			onFocusIn={() => setFocused(true)}
			onFocusOut={() => setFocused(false)}
		>
			<FormLabel
				id={local.id}
				label={local.label}
				focused={focused()}
				required={rest.required}
				theme="basic"
				startSlot={local.labelStart}
				rightSlot={local.labelEnd}
			/>
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
			<FieldFeedback
				id={local.id}
				describedBy={local.description}
				errors={local.errors}
			/>
		</div>
	);
};
