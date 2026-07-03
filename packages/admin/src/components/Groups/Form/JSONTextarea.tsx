import { indentWithTab } from "@codemirror/commands";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { linter, lintGutter } from "@codemirror/lint";
import { EditorView, keymap } from "@codemirror/view";
import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import { basicSetup } from "codemirror";
import {
	createCodeMirror,
	createEditorControlledValue,
	createEditorReadonly,
} from "solid-codemirror";
import {
	type Component,
	createMemo,
	createSignal,
	type JSXElement,
} from "solid-js";
import { DescribedBy, ErrorMessage, Label } from "@/components/Groups/Form";
import T from "@/translations";
import { cmHighlighting, cmTheme } from "@/utils/codemirror-json-theme";

interface JSONTextareaProps {
	id: string;
	value: string;
	onChange: (_value: string) => void;
	name: string;
	copy?: {
		label?: string;
		placeholder?: string;
		describedBy?: string;
	};
	onBlur?: () => void;
	autoFoucs?: boolean;
	onKeyUp?: (_e: KeyboardEvent) => void;
	required?: boolean;
	disabled?: boolean;
	errors?: ErrorResult | FieldError;
	localised?: boolean;
	altLocaleError?: boolean;
	noMargin?: boolean;
	fieldColumnIsMissing?: boolean;
	hideOptionalText?: boolean;
	labelRightSlot?: JSXElement;
}

const JSON_TEXTAREA_MIN_HEIGHT = "9rem";

export const JSONTextarea: Component<JSONTextareaProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [inputFocus, setInputFocus] = createSignal(false);
	const [jsonError, setJsonError] = createSignal<string | null>(null);

	// ----------------------------------------
	// Memos
	const displayErrors = createMemo(() => {
		const local = jsonError();
		if (local) {
			return {
				key: props.name,
				localeCode: null,
				message: {
					type: "lucid.literal",
					value: `${local}. ${T()("fields.json.invalid.save.warning")}.`,
				},
			} satisfies FieldError;
		}
		return props.errors;
	});

	const code = createMemo(() => props.value);

	// ----------------------------------------
	// Functions
	const isEmptyJsonValue = (value: string) => value.trim() === "";

	const toggleErrorBorder = (hasError: boolean) => {
		const view = editorView();
		if (!view) return;
		view.dom.classList.toggle("cm-json-invalid", hasError);
	};

	// ----------------------------------------
	// CodeMirror
	const {
		ref: editorRef,
		editorView,
		createExtension,
	} = createCodeMirror({
		onValueChange: (value) => {
			if (isEmptyJsonValue(value)) {
				setJsonError(null);
				toggleErrorBorder(false);
				props.onChange(value);
				return;
			}

			try {
				JSON.parse(value);
				setJsonError(null);
				toggleErrorBorder(false);
			} catch (e) {
				setJsonError((e as SyntaxError).message);
				toggleErrorBorder(true);
			}
			props.onChange(value);
		},
	});

	createEditorControlledValue(editorView, code);
	createEditorReadonly(editorView, () => props.disabled ?? false);

	createExtension(basicSetup);
	createExtension(keymap.of([indentWithTab]));
	createExtension(json());
	const jsonLinter = jsonParseLinter();
	createExtension(
		linter((view) => {
			if (isEmptyJsonValue(view.state.doc.toString())) return [];
			return jsonLinter(view);
		}),
	);
	createExtension(lintGutter());
	createExtension(cmTheme);
	createExtension(cmHighlighting);
	createExtension(EditorView.lineWrapping);
	createExtension(
		EditorView.theme({
			"&": {
				minHeight: JSON_TEXTAREA_MIN_HEIGHT,
			},
			".cm-scroller": {
				alignItems: "stretch",
				minHeight: JSON_TEXTAREA_MIN_HEIGHT,
			},
			".cm-content": {
				minHeight: JSON_TEXTAREA_MIN_HEIGHT,
			},
			".cm-gutters": {
				minHeight: JSON_TEXTAREA_MIN_HEIGHT,
			},
			".cm-gutter": {
				minHeight: JSON_TEXTAREA_MIN_HEIGHT,
			},
		}),
	);
	createExtension(
		EditorView.updateListener.of((update) => {
			if (update.focusChanged) {
				setInputFocus(update.view.hasFocus);
				if (!update.view.hasFocus) {
					const doc = update.view.state.doc.toString();
					if (isEmptyJsonValue(doc)) {
						setJsonError(null);
						toggleErrorBorder(false);
						if (doc !== "") {
							props.onChange("");
						}
						props.onBlur?.();
						return;
					}

					try {
						const formatted = JSON.stringify(JSON.parse(doc), null, 2);
						setJsonError(null);
						toggleErrorBorder(false);
						if (formatted !== doc) {
							props.onChange(formatted);
						}
					} catch {
						// invalid JSON — leave as-is
					}
					props.onBlur?.();
				}
			}
		}),
	);
	createExtension(
		EditorView.domEventHandlers({
			keydown(e) {
				e.stopPropagation();
			},
		}),
	);

	// ----------------------------------------
	// Render
	return (
		<div
			class={classnames("w-full", {
				"mb-3 last:mb-0": props.noMargin !== true,
			})}
		>
			<Label
				id={props.id}
				label={props.copy?.label}
				focused={inputFocus()}
				required={props.required}
				theme={"basic"}
				altLocaleError={props.altLocaleError}
				localised={props.localised}
				fieldColumnIsMissing={props.fieldColumnIsMissing}
				hideOptionalText={props.hideOptionalText}
				rightSlot={props.labelRightSlot}
			/>
			<div
				id={props.id}
				ref={editorRef}
				class={classnames("overflow-hidden rounded-md", {
					"opacity-80 cursor-not-allowed pointer-events-none": props.disabled,
				})}
			/>
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<ErrorMessage id={props.id} errors={displayErrors()} />
		</div>
	);
};
