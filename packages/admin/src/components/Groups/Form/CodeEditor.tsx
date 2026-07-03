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
	type JSXElement,
	Show,
} from "solid-js";
import { DescribedBy, ErrorMessage, Label } from "@/components/Groups/Form";
import DropdownContent from "@/components/Partials/DropdownContent";
import T from "@/translations";
import {
	getCodeLanguageLabel,
	loadCodeLanguageExtension,
} from "@/utils/code-field-languages";
import { cmHighlighting, cmTheme } from "@/utils/codemirror-theme";

interface CodeEditorProps {
	id: string;
	value: string;
	language: string;
	languages: string[];
	onChange: (_value: string) => void;
	onLanguageChange: (_language: string) => void;
	name: string;
	copy?: {
		label?: string;
		placeholder?: string;
		describedBy?: string;
	};
	onBlur?: () => void;
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

const CODE_EDITOR_MIN_HEIGHT = "9rem";

export const CodeEditor: Component<CodeEditorProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [inputFocus, setInputFocus] = createSignal(false);
	const [languageMenuOpen, setLanguageMenuOpen] = createSignal(false);

	// ----------------------------------------
	// Memos
	const code = createMemo(() => props.value);
	const languageOptions = createMemo(() =>
		props.languages.map((language) => ({
			value: language,
			label: getCodeLanguageLabel(language),
		})),
	);
	const selectedLanguageLabel = createMemo(
		() =>
			languageOptions().find((option) => option.value === props.language)
				?.label ?? getCodeLanguageLabel(props.language),
	);

	// ----------------------------------------
	// CodeMirror
	const {
		ref: editorRef,
		editorView,
		createExtension,
	} = createCodeMirror({
		onValueChange: (value) => {
			props.onChange(value);
		},
	});

	createEditorControlledValue(editorView, code);
	createEditorReadonly(editorView, () => props.disabled ?? false);

	const languageCompartment = new Compartment();
	const placeholderCompartment = new Compartment();

	createExtension(basicSetup);
	createExtension(keymap.of([indentWithTab]));
	createExtension(languageCompartment.of([]));
	createExtension(placeholderCompartment.of([]));
	createExtension(cmTheme);
	createExtension(cmHighlighting);
	createExtension(EditorView.lineWrapping);
	createExtension(
		Prec.highest(
			EditorView.theme({
				"&": {
					minHeight: CODE_EDITOR_MIN_HEIGHT,
					border: "0",
					borderRadius: "0 0 6px 6px",
					overflow: "hidden",
				},
				"&.cm-focused": {
					border: "0",
				},
				".cm-scroller": {
					alignItems: "stretch",
					minHeight: CODE_EDITOR_MIN_HEIGHT,
					borderRadius: "0 0 6px 6px",
				},
				".cm-content": {
					minHeight: CODE_EDITOR_MIN_HEIGHT,
				},
				".cm-gutters": {
					minHeight: CODE_EDITOR_MIN_HEIGHT,
					borderRadius: "0 0 0 6px",
				},
				".cm-gutter": {
					minHeight: CODE_EDITOR_MIN_HEIGHT,
					borderRadius: "0 0 0 6px",
				},
			}),
		),
	);
	createExtension(
		EditorView.updateListener.of((update) => {
			if (update.focusChanged) {
				setInputFocus(update.view.hasFocus);
				if (!update.view.hasFocus) {
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
	createEffect(() => {
		const view = editorView();
		const placeholderValue = props.copy?.placeholder;
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
					"overflow-hidden rounded-md border border-border bg-input-base transition-colors duration-200",
					{
						"border-primary-base": inputFocus() || languageMenuOpen(),
						"opacity-80 cursor-not-allowed": props.disabled,
					},
				)}
			>
				<div class="flex h-9 items-center justify-start border-b border-border bg-[#141414] px-2">
					<DropdownMenu.Root
						open={languageMenuOpen()}
						onOpenChange={setLanguageMenuOpen}
						gutter={5}
						placement="bottom-start"
					>
						<DropdownMenu.Trigger
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
												onSelect={() => props.onLanguageChange(option.value)}
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
				<div
					id={props.id}
					ref={editorRef}
					class={classnames("overflow-hidden", {
						"pointer-events-none": props.disabled,
					})}
				/>
			</div>
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};
