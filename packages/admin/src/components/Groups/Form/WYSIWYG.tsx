import { type Component, createSignal, onMount, onCleanup } from "solid-js";
import classnames from "classnames";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import type { ErrorResult, FieldErrors } from "@lucidcms/core/types";
import Form from "@/components/Groups/Form";

interface WYSIWYGProps {
	id: string;
	value: string;
	onChange: (_value: string) => void;
	copy?: {
		label?: string;
		placeholder?: string;
		describedBy?: string;
	};
	required?: boolean;
	disabled?: boolean;
	errors?: ErrorResult | FieldErrors;
	altLocaleError?: boolean;
	noMargin?: boolean;
}

export const WYSIWYG: Component<WYSIWYGProps> = (props) => {
	// -------------------------------
	// State
	const [inputFocus, setInputFocus] = createSignal(false);
	const [getQuill, setQuill] = createSignal<Quill | undefined>(undefined);
	let quillElement: HTMLDivElement | undefined;

	// -------------------------------
	// Lifecycle
	onMount(() => {
		if (!quillElement) return;

		const quill = new Quill(quillElement, {
			theme: "snow",
			placeholder: props.copy?.placeholder,
			modules: {
				toolbar: [
					[{ header: [1, 2, 3, 4, 5, 6, false] }],
					["bold", "italic", "underline", "strike"],
					[{ list: "ordered" }, { list: "bullet" }],
					["link"],
					["clean"],
				],
			},
		});
		quill.on("text-change", () => {
			if (props.disabled) return;
			if (props.value === quill.root.innerHTML) return;
			props.onChange(quill.root.innerHTML);
		});

		quill.root.innerHTML = props.value;
		setQuill(quill);
	});

	onCleanup(() => {
		if (!quillElement) return;
		if (!getQuill()) return;
		quillElement.remove();
		setQuill(undefined);
	});

	// ----------------------------------------
	// Render
	return (
		<div
			class={classnames("w-full max-w-full", {
				"mb-0": props.noMargin,
				"mb-5 last:mb-0": !props.noMargin,
			})}
		>
			<Form.Label
				id={props.id}
				label={props.copy?.label}
				focused={inputFocus()}
				required={props.required}
				theme={"basic"}
				altLocaleError={props.altLocaleError}
			/>
			<div
				class={classnames("mt-1 bg-container-4 rounded-md", {
					"cursor-not-allowed opacity-80 pointer-events-none": props.disabled,
				})}
			>
				<div
					ref={quillElement}
					onFocus={() => setInputFocus(true)}
					onBlur={() => setInputFocus(false)}
					class="[&>.ql-editor]:min-h-72"
				/>
			</div>
			<Form.DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<Form.ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};
