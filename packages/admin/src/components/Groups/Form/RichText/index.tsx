import type { RichTextJSON } from "@lucidcms/rich-text";
import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";
import { DescribedBy, ErrorMessage, Label } from "@/components/Groups/Form";
import Toolbar from "./Toolbar";
import type { RichTextOptions } from "./types";
import useEditor from "./useEditor";

export type { RichTextOptions } from "./types";

interface RichTextProps {
	id: string;
	value: RichTextJSON | null | undefined;
	onChange: (_value: RichTextJSON) => void;
	copy?: {
		label?: string;
		placeholder?: string;
		describedBy?: string;
	};
	required?: boolean;
	disabled?: boolean;
	errors?: ErrorResult | FieldError;
	localised?: boolean;
	altLocaleError?: boolean;
	noMargin?: boolean;
	fieldColumnIsMissing?: boolean;
	hideOptionalText?: boolean;
	labelRightSlot?: JSXElement;
	options?: RichTextOptions;
}

export const RichText: Component<RichTextProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const { editor, focused, setContainer } = useEditor({
		get value() {
			return props.value ?? null;
		},
		onChange: props.onChange,
		get disabled() {
			return props.disabled;
		},
		get options() {
			return props.options;
		},
	});

	// ----------------------------------------
	// Render
	return (
		<div
			class={classnames("w-full max-w-full", {
				"mb-3 last:mb-0": props.noMargin !== true,
			})}
		>
			<div class="relative">
				<Label
					id={props.id}
					label={props.copy?.label}
					focused={focused()}
					required={props.required}
					theme={"basic"}
					altLocaleError={props.altLocaleError}
					localised={props.localised}
					fieldColumnIsMissing={props.fieldColumnIsMissing}
					hideOptionalText={props.hideOptionalText}
					rightSlot={props.labelRightSlot}
				/>
			</div>
			<div
				class={classnames(
					"rounded-md border border-border bg-input-base overflow-hidden focus-within:border-primary-base transition-colors duration-200",
					{
						"cursor-not-allowed opacity-80 pointer-events-none": props.disabled,
					},
				)}
			>
				<Show when={editor()}>
					{(instance) => (
						<Toolbar
							editor={instance()}
							disabled={props.disabled}
							options={props.options}
						/>
					)}
				</Show>
				<div ref={setContainer} />
			</div>
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};
