import { indentWithTab } from "@codemirror/commands";
import { Compartment, Prec } from "@codemirror/state";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { DropdownMenu } from "@kobalte/core";
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
import DropdownContent from "@/components/DropdownContent/DropdownContent";
import { Field } from "@/components/Field/Field";
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
	/** Language the content is highlighted as, such as "json" or "html". */
	language: string;
	/** Offers a switcher in the toolbar. Without it there is no toolbar. */
	languages?: string[];
	onLanguageChange?: (_language: string) => void;
	/**
	 * Marks syntax errors in the gutter and reports the parse error as a field
	 * error. JSON only for now.
	 */
	lint?: boolean;
	/** Reformats valid content when the editor loses focus. JSON only for now. */
	format?: boolean;
	label?: string;
	/** Shown while the editor is empty. */
	placeholder?: string;
	/** Sits under the control, and is read out alongside it. */
	description?: string;
	errors?: ErrorResult | FieldError;
	required?: boolean;
	disabled?: boolean;
	onBlur?: () => void;
	/** Before the label text, for an icon or badge. */
	labelStart?: JSXElement;
	/** After the label, against the right edge. */
	labelEnd?: JSXElement;
	/** Applied to the field. Target [data-code-editor-control] for the editor. */
	class?: string;
}

const CODE_EDITOR_MIN_HEIGHT = "9rem";
const isBlank = (value: string) => value.trim() === "";

/**
 * A code editor with syntax highlighting, line numbers and an optional
 * language switcher. Give it `lint` to flag syntax errors as you type, and
 * `format` to tidy the content when it loses focus.
 *
 * @example
 * ```tsx
 * import { CodeEditor } from "@lucidcms/admin/components";
 *
 * return (
 * 	<CodeEditor
 * 		id="payload"
 * 		name="payload"
 * 		label="Payload"
 * 		language="json"
 * 		lint
 * 		format
 * 		value={payload()}
 * 		onChange={setPayload}
 * 	/>
 * );
 * ```
 */
export const CodeEditor: Component<CodeEditorProps> = (props) => {
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
	/** A toolbar earns its space only when there is something to switch between. */
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
	/** A syntax error outranks a server error: it is why nothing was saved. */
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
	//* the linter is pulled in on demand, the same way languages are
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
						<DropdownMenu.Root
							open={languageMenuOpen()}
							onOpenChange={setLanguageMenuOpen}
							gutter={5}
							placement="bottom-start"
						>
							<DropdownMenu.Trigger
								data-code-editor-language
								id={`${props.id}-language`}
								aria-label={T()("fields.code.language.aria.label")}
								class="inline-flex h-7 max-w-full items-center gap-1.5 rounded-md px-2 text-sm font-medium text-subtitle transition-colors duration-150 outline-none hover:bg-background-hover hover:text-title focus-visible:ring-1 focus:ring-primary-base disabled:cursor-not-allowed disabled:opacity-50"
								onFocus={() => setInputFocus(true)}
								onBlur={() => setInputFocus(false)}
								disabled={props.disabled}
							>
								<span class="truncate">{selectedLanguageLabel()}</span>
								<DropdownMenu.Icon>
									<FaSolidChevronDown size={10} class="text-current" />
								</DropdownMenu.Icon>
							</DropdownMenu.Trigger>
							<DropdownContent
								options={{
									rounded: true,
									class: "w-44 p-1.5! z-70",
									maxHeight: "md",
									noMargin: true,
								}}
							>
								<ul class="flex flex-col gap-y-0.5">
									<For each={languageOptions()}>
										{(option) => (
											<li>
												<DropdownMenu.Item
													class={classnames(
														"flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1 text-sm text-subtitle outline-none transition-colors hover:bg-dropdown-hover hover:text-dropdown-contrast focus-visible:ring-1 focus:ring-primary-base",
														{
															"bg-dropdown-hover text-dropdown-contrast":
																props.language === option.value,
														},
													)}
													onSelect={() =>
														props.onLanguageChange?.(option.value)
													}
												>
													<span class="truncate">{option.label}</span>
													<Show when={props.language === option.value}>
														<FaSolidCheck size={12} class="shrink-0" />
													</Show>
												</DropdownMenu.Item>
											</li>
										)}
									</For>
								</ul>
							</DropdownContent>
						</DropdownMenu.Root>
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
