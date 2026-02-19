import { indentWithTab } from "@codemirror/commands";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import {
	syntaxHighlighting as cmSyntaxHighlighting,
	HighlightStyle,
} from "@codemirror/language";
import { linter, lintGutter } from "@codemirror/lint";
import { EditorView, keymap } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import { basicSetup } from "codemirror";
import {
	createCodeMirror,
	createEditorControlledValue,
	createEditorReadonly,
} from "solid-codemirror";
import { type Component, createMemo, createSignal } from "solid-js";
import { DescribedBy, ErrorMessage, Label } from "@/components/Groups/Form";
import T from "@/translations";

const EDITOR_MAX_HEIGHT = "24rem";

const cmTheme = EditorView.theme(
	{
		"&": {
			backgroundColor: "#181818",
			color: "#E3E3E3",
			fontSize: "13px",
			borderRadius: "6px",
			border: "1px solid rgba(255, 255, 255, 0.1)",
			transition: "border-color 200ms",
			maxHeight: EDITOR_MAX_HEIGHT,
		},
		"&.cm-focused": {
			outline: "none",
			borderColor: "#C1FE77",
		},
		".cm-scroller": {
			overflow: "auto",
		},
		".cm-content": {
			caretColor: "#C1FE77",
			fontFamily:
				'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
			padding: "8px 0",
		},
		".cm-gutters": {
			backgroundColor: "#141414",
			color: "#555",
			border: "none",
			borderRadius: "6px 0 0 6px",
		},
		".cm-cursor, .cm-dropCursor": {
			borderLeftColor: "#C1FE77",
		},
		".cm-activeLine": {
			backgroundColor: "rgba(255, 255, 255, 0.03)",
		},
		".cm-activeLineGutter": {
			backgroundColor: "rgba(255, 255, 255, 0.05)",
			color: "#888",
		},
		".cm-selectionBackground, ::selection": {
			backgroundColor: "rgba(193, 254, 119, 0.15) !important",
		},
		".cm-selectionMatch": {
			backgroundColor: "rgba(193, 254, 119, 0.1)",
		},
		".cm-matchingBracket": {
			backgroundColor: "rgba(193, 254, 119, 0.25)",
			color: "#C1FE77 !important",
		},
		".cm-nonmatchingBracket": {
			backgroundColor: "rgba(247, 85, 85, 0.25)",
			color: "#F75555 !important",
		},
		".cm-foldPlaceholder": {
			backgroundColor: "rgba(255, 255, 255, 0.1)",
			border: "none",
			color: "#999",
		},
		".cm-tooltip": {
			backgroundColor: "#171717",
			border: "1px solid rgba(255, 255, 255, 0.1)",
			borderRadius: "6px",
			color: "#E3E3E3",
		},
		".cm-tooltip-autocomplete": {
			"& > ul > li[aria-selected]": {
				backgroundColor: "rgba(193, 254, 119, 0.15)",
			},
		},
		".cm-panels": {
			backgroundColor: "#141414",
			color: "#E3E3E3",
		},
		".cm-panels.cm-panels-top": {
			borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
		},
		".cm-panels.cm-panels-bottom": {
			borderTop: "1px solid rgba(255, 255, 255, 0.1)",
		},
		".cm-searchMatch": {
			backgroundColor: "rgba(193, 254, 119, 0.2)",
		},
		".cm-searchMatch.cm-searchMatch-selected": {
			backgroundColor: "rgba(193, 254, 119, 0.35)",
		},
		".cm-lint-marker-error": {
			content: "none",
		},
		".cm-lintRange-error": {
			backgroundImage: "none",
			textDecoration: "underline wavy #F75555",
		},
		".cm-diagnostic-error": {
			borderLeftColor: "#F75555",
		},
		".cm-placeholder": {
			color: "#555",
			fontStyle: "italic",
		},
		"&.cm-json-invalid": {
			borderColor: "#F75555",
		},
		"&.cm-json-invalid.cm-focused": {
			borderColor: "#F75555",
		},
	},
	{ dark: true },
);

const highlightStyle = HighlightStyle.define([
	{ tag: tags.string, color: "#C1FE77" },
	{ tag: tags.number, color: "#7EC8E3" },
	{ tag: tags.bool, color: "#FF9E64" },
	{ tag: tags.null, color: "#FF9E64" },
	{ tag: tags.propertyName, color: "#E3E3E3" },
	{ tag: tags.punctuation, color: "#666" },
	{ tag: tags.brace, color: "#888" },
	{ tag: tags.squareBracket, color: "#888" },
]);

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
}

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
				message: `${local}. ${T()("json_invalid_save_warning")}.`,
			} satisfies FieldError;
		}
		return props.errors;
	});

	const code = createMemo(() => props.value);

	// ----------------------------------------
	// Functions
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
	createExtension(linter(jsonParseLinter()));
	createExtension(lintGutter());
	createExtension(cmTheme);
	createExtension(cmSyntaxHighlighting(highlightStyle));
	createExtension(EditorView.lineWrapping);
	createExtension(
		EditorView.updateListener.of((update) => {
			if (update.focusChanged) {
				setInputFocus(update.view.hasFocus);
				if (!update.view.hasFocus) {
					const doc = update.view.state.doc.toString();
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
