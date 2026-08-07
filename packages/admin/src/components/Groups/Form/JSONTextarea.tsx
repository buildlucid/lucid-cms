import { indentWithTab } from "@codemirror/commands";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { linter, lintGutter } from "@codemirror/lint";
import { Compartment, Prec } from "@codemirror/state";
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
	createEffect,
	createMemo,
	createSignal,
	type JSXElement,
} from "solid-js";
import themeStore from "@/store/themeStore";
import T from "@/translations";
import { getCodeMirrorTheme } from "@/utils/codemirror-theme";
import { DescribedBy } from "./DescribedBy";
import { ErrorMessage } from "./ErrorMessage";
import { Label } from "./Label";

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
				props.onChange(value);
				return;
			}

			try {
				JSON.parse(value);
				setJsonError(null);
			} catch (e) {
				setJsonError((e as SyntaxError).message);
			}
			props.onChange(value);
		},
	});

	createEditorControlledValue(editorView, code);
	createEditorReadonly(editorView, () => props.disabled ?? false);
	const themeCompartment = new Compartment();

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
	createExtension(
		themeCompartment.of(getCodeMirrorTheme(themeStore.resolved())),
	);
	createExtension(EditorView.lineWrapping);
	createExtension(
		Prec.highest(
			EditorView.theme({
				"&": {
					minHeight: JSON_TEXTAREA_MIN_HEIGHT,
					border: "0",
					overflow: "hidden",
				},
				"&.cm-focused": {
					border: "0",
					outline: "none",
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
		),
	);
	createExtension(
		EditorView.updateListener.of((update) => {
			if (update.focusChanged) {
				setInputFocus(update.view.hasFocus);
				if (!update.view.hasFocus) {
					const doc = update.view.state.doc.toString();
					if (isEmptyJsonValue(doc)) {
						setJsonError(null);
						if (doc !== "") {
							props.onChange("");
						}
						props.onBlur?.();
						return;
					}

					try {
						const formatted = JSON.stringify(JSON.parse(doc), null, 2);
						setJsonError(null);
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

	createEffect(() => {
		const view = editorView();
		const theme = themeStore.resolved();
		if (!view) return;

		view.dispatch({
			effects: themeCompartment.reconfigure(getCodeMirrorTheme(theme)),
		});
	});

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
				class={classnames(
					"code-editor-shell overflow-hidden rounded-md border border-border bg-input-base transition-colors duration-200",
					{
						"border-primary-base":
							inputFocus() && displayErrors() === undefined,
						"border-error-base": displayErrors() !== undefined,
						"opacity-80 cursor-not-allowed": props.disabled,
					},
				)}
			>
				<div
					id={props.id}
					ref={editorRef}
					class={classnames("overflow-hidden", {
						"pointer-events-none": props.disabled,
					})}
				/>
			</div>
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<ErrorMessage id={props.id} errors={displayErrors()} />
		</div>
	);
};
