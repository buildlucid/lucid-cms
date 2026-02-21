import type { RichTextJSON } from "@lucidcms/rich-text";
import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import { type Component, Show } from "solid-js";
import { DescribedBy, ErrorMessage, Label } from "@/components/Groups/Form";
import Toolbar from "./Toolbar";
import useEditor from "./useEditor";

interface WYSIWYGProps {
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
}

export const WYSIWYG: Component<WYSIWYGProps> = (props) => {
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
	});

	// ----------------------------------------
	// Render
	return (
		<div
			class={classnames("w-full max-w-full", {
				"mb-3 last:mb-0": props.noMargin !== true,
			})}
		>
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
			/>
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
						<Toolbar editor={instance()} disabled={props.disabled} />
					)}
				</Show>
				<div ref={setContainer} />
			</div>
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};
