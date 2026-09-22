import { indentWithTab } from "@codemirror/commands";
import { Compartment, Prec } from "@codemirror/state";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import { basicSetup } from "codemirror";
import {
	createCodeMirror,
	createEditorControlledValue,
	createEditorReadonly,
} from "solid-codemirror";
import { FaSolidCheck, FaSolidChevronDown } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	type JSX,
	type JSXElement,
	Show,
	splitProps,
} from "solid-js";
import Field from "@/components/Field/Field";
import Menu from "@/components/Menu/Menu";
import themeStore from "@/store/themeStore/themeStore";
import T from "@/translations";
import { getCodeMirrorTheme } from "@/utils/codemirror-theme";
import {
	getCodeLanguageLabel,
	loadCodeLanguageExtension,
} from "./utils/code-field-languages";

export interface CodeEditorProps extends JSX.AriaAttributes {
	id: string;
	name: string;
	value: string;
	onChange: (_value: string) => void;
	/** Such as "json" or "html". */
	language: string;
	/** Languages the user can switch between. */
	languages?: string[];
	onLanguageChange?: (_language: string) => void;
	/** Highlights syntax errors. JSON only. */
	lint?: boolean;
	/** Formats the content on blur. JSON only. */
	format?: boolean;
	label?: string;
	placeholder?: string;
	description?: string;
	errors?: ErrorResult | FieldError;
	required?: boolean;
	disabled?: boolean;
	onBlur?: () => void;
	labelStart?: JSXElement;
	labelEnd?: JSXElement;
	/** Applied to the field. Target `[data-code-editor-control]` for the editor. */
	class?: string;
}

const CODE_EDITOR_MIN_HEIGHT = "9rem";
const isBlank = (value: string) => value.trim() === "";

/**
 * A code editor with syntax highlighting, a label, description and validation
 * errors.
 *
 * @example
 * ```tsx
 * import { CodeEditor } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<CodeEditor
 * 		id="schema"
 * 		name="schema"
 * 		label={t("structured.data")}
 * 		language="json"
 * 		value={schema()}
 * 		onChange={setSchema}
 * 		lint
 * 		format
 * 	/>
 * );
 * ```
 */
const CodeEditor: Component<CodeEditorProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [, ariaProps] = splitProps(props, [
		"id",
		"name",
		"value",
		"onChange",
		"language",
		"languages",
		"onLanguageChange",
		"lint",
		"format",
		"label",
		"placeholder",
		"description",
		"errors",
		"required",
		"disabled",
		"onBlur",
		"labelStart",
		"labelEnd",
		"class",
	]);
	const [inputFocus, setInputFocus] = createSignal(false);
	const [languageMenuOpen, setLanguageMenuOpen] = createSignal(false);
	const [parseError, setParseError] = createSignal<string | null>(null);

	// ----------------------------------------
	// Memos
	const code = createMemo(() =>
		typeof props.value === "string" ? props.value : "",
	);
	/** Only shown when there are languages to switch between. */
	const showToolbar = createMemo(() => (props.languages?.length ?? 0) > 1);
	const languageOptions = createMemo(() =>
		(props.languages ?? []).map((language) => ({
			value: language,
			label: getCodeLanguageLabel(language),
		})),
	);
	const selectedLanguageLabel = createMemo(
		() =>
			languageOptions().find((option) => option.value === props.language)
				?.label ?? getCodeLanguageLabel(props.language),
	);
	/** Syntax errors take priority over server errors. */
	const displayErrors = createMemo(() => {
		const local = parseError();
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

	// ----------------------------------------
	// CodeMirror
	const {
		ref: editorRef,
		editorView,
		createExtension,
	} = createCodeMirror({
		onValueChange: (value) => {
			if (props.lint) {
				if (isBlank(value)) {
					setParseError(null);
				} else {
					try {
						JSON.parse(value);
						setParseError(null);
					} catch (error) {
						setParseError((error as SyntaxError).message);
					}
				}
			}
			props.onChange(value);
		},
	});

	createEditorControlledValue(editorView, code);
	createEditorReadonly(editorView, () => props.disabled ?? false);

	const languageCompartment = new Compartment();
	const placeholderCompartment = new Compartment();
	const lintCompartment = new Compartment();
	const themeCompartment = new Compartment();

	createExtension(basicSetup);
	createExtension(keymap.of([indentWithTab]));
	createExtension(languageCompartment.of([]));
	createExtension(placeholderCompartment.of([]));
	createExtension(lintCompartment.of([]));
	createExtension(
		themeCompartment.of(getCodeMirrorTheme(themeStore.resolved())),
	);
	createExtension(EditorView.lineWrapping);
	createExtension(
		Prec.highest(
			EditorView.theme({
				"&": {
					minHeight: CODE_EDITOR_MIN_HEIGHT,
					border: "0",
					overflow: "hidden",
				},
				"&.cm-focused": {
					border: "0",
				},
				".cm-scroller": {
					alignItems: "stretch",
					minHeight: CODE_EDITOR_MIN_HEIGHT,
				},
				".cm-content": {
					minHeight: CODE_EDITOR_MIN_HEIGHT,
				},
				".cm-gutters": {
					minHeight: CODE_EDITOR_MIN_HEIGHT,
				},
				".cm-gutter": {
					minHeight: CODE_EDITOR_MIN_HEIGHT,
				},
			}),
		),
	);
	createExtension(
		EditorView.updateListener.of((update) => {
			if (!update.focusChanged) return;

			setInputFocus(update.view.hasFocus);
			if (update.view.hasFocus) return;

			if (props.format) {
				const doc = update.view.state.doc.toString();
				if (isBlank(doc)) {
					setParseError(null);
					if (doc !== "") props.onChange("");
				} else {
					try {
						const formatted = JSON.stringify(JSON.parse(doc), null, 2);
						setParseError(null);
						if (formatted !== doc) props.onChange(formatted);
					} catch {
						//* leave it alone, the lint error already explains why
					}
				}
			}

			props.onBlur?.();
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
	// Effects
	let languageLoadId = 0;
	createEffect(() => {
		const view = editorView();
		const language = props.language;
		if (!view) return;

		const loadId = ++languageLoadId;
		loadCodeLanguageExtension(language)
			.then((extension) => {
				if (loadId !== languageLoadId) return;
				view.dispatch({
					effects: languageCompartment.reconfigure(extension ?? []),
				});
			})
			.catch(() => {
				if (loadId !== languageLoadId) return;
				view.dispatch({
					effects: languageCompartment.reconfigure([]),
				});
			});
	});
	//* load the linter on demand, like languages
	let lintLoadId = 0;
	createEffect(() => {
		const view = editorView();
		const enabled = props.lint === true;
		if (!view) return;

		const loadId = ++lintLoadId;
		if (!enabled) {
			view.dispatch({ effects: lintCompartment.reconfigure([]) });
			return;
		}

		Promise.all([import("@codemirror/lint"), import("@codemirror/lang-json")])
			.then(([lint, json]) => {
				if (loadId !== lintLoadId) return;
				const jsonLinter = json.jsonParseLinter();
				view.dispatch({
					effects: lintCompartment.reconfigure([
						lint.linter((target) =>
							isBlank(target.state.doc.toString()) ? [] : jsonLinter(target),
						),
						lint.lintGutter(),
					]),
				});
			})
			.catch(() => {
				if (loadId !== lintLoadId) return;
				view.dispatch({ effects: lintCompartment.reconfigure([]) });
			});
	});
	createEffect(() => {
		const view = editorView();
		const theme = themeStore.resolved();
		if (!view) return;

		view.dispatch({
			effects: themeCompartment.reconfigure(getCodeMirrorTheme(theme)),
		});
	});
	createEffect(() => {
		const view = editorView();
		const placeholderValue = props.placeholder;
		if (!view) return;

		view.dispatch({
			effects: placeholderCompartment.reconfigure(
				placeholderValue ? placeholder(placeholderValue) : [],
			),
		});
	});

	// ----------------------------------------
	// Render
	return (
		<Field.Root
			id={props.id}
			required={props.required}
			disabled={props.disabled}
			errors={displayErrors()}
			class={props.class}
		>
			<Show when={props.label !== undefined || props.labelEnd !== undefined}>
				<Field.Label start={props.labelStart} end={props.labelEnd}>
					{props.label}
				</Field.Label>
			</Show>
			<div
				data-code-editor
				class={classnames(
					"code-editor-shell overflow-hidden rounded-md border border-border bg-input-base transition-colors duration-200",
					{
						"border-primary-base": inputFocus() || languageMenuOpen(),
						"opacity-80 cursor-not-allowed": props.disabled,
					},
				)}
			>
				<Show when={showToolbar()}>
					<div class="flex h-9 items-center justify-start border-b border-border bg-(--lucid-code-toolbar) px-2">
						<Menu.Root
							open={languageMenuOpen()}
							onOpenChange={setLanguageMenuOpen}
							gutter={5}
							placement="bottom-start"
						>
							<Menu.Trigger
								data-code-editor-language
								id={`${props.id}-language`}
								aria-label={T()("fields.code.language.aria.label")}
								class="inline-flex h-7 max-w-full items-center gap-1.5 rounded-md px-2 text-sm font-medium text-subtitle transition-colors duration-150 outline-none hover:bg-background-hover hover:text-title focus-visible:ring-1 focus:ring-primary-base disabled:cursor-not-allowed disabled:opacity-50"
								onFocus={() => setInputFocus(true)}
								onBlur={() => setInputFocus(false)}
								disabled={props.disabled}
							>
								<span class="truncate">{selectedLanguageLabel()}</span>
								<FaSolidChevronDown size={10} class="text-current" />
							</Menu.Trigger>
							<Menu.Content class="z-70" scrollable>
								<For each={languageOptions()}>
									{(option) => (
										<Menu.Item
											selected={props.language === option.value}
											onSelect={() => props.onLanguageChange?.(option.value)}
											end={
												props.language === option.value ? (
													<FaSolidCheck size={12} class="shrink-0" />
												) : undefined
											}
										>
											{option.label}
										</Menu.Item>
									)}
								</For>
							</Menu.Content>
						</Menu.Root>
					</div>
				</Show>
				<div
					{...ariaProps}
					data-code-editor-control
					id={props.id}
					ref={editorRef}
					class={classnames("overflow-hidden", {
						"pointer-events-none": props.disabled,
					})}
				/>
			</div>
			<Field.Error />
			<Show when={props.description}>
				{(description) => (
					<Field.Description>{description()}</Field.Description>
				)}
			</Show>
		</Field.Root>
	);
};

export default CodeEditor;
