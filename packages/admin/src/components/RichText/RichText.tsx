import type { RichTextJSON } from "@lucidcms/rich-text";
import type { Extensions } from "@tiptap/core";
import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import {
	type Component,
	createMemo,
	type JSX,
	type JSXElement,
	Show,
	splitProps,
} from "solid-js";
import Field from "@/components/Field/Field";
import T from "@/translations";
import { richTextHasContent } from "./helpers";
import Toolbar from "./parts/Toolbar";
import type { RichTextOptions } from "./types";
import useEditor from "./useEditor";

export interface RichTextProps extends JSX.AriaAttributes {
	id: string;
	name: string;
	value: RichTextJSON | null | undefined;
	onChange: (_value: RichTextJSON) => void;
	label?: string;
	placeholder?: string;
	description?: string;
	errors?: ErrorResult | FieldError;
	required?: boolean;
	disabled?: boolean;
	/** @default true */
	headings?: boolean;
	/** @default true */
	bold?: boolean;
	/** @default true */
	italic?: boolean;
	/** @default true */
	underline?: boolean;
	/** @default true */
	strikethrough?: boolean;
	/** @default true */
	bulletList?: boolean;
	/** @default true */
	orderedList?: boolean;
	/** @default true */
	clearFormatting?: boolean;
	/** @default true */
	links?: boolean;
	/** Tiptap extensions to add, or to replace built in ones with the same name. Read once on mount. */
	extensions?: Extensions;
	/** Content added to the end of the toolbar. */
	toolbarEnd?: JSXElement;
	labelStart?: JSXElement;
	labelEnd?: JSXElement;
	/** Applied to the field. Target `[data-rich-text-control]` for the editor. */
	class?: string;
}

/**
 * A rich text editor with a formatting toolbar. Each formatting option can be
 * turned off, and `extensions` adds your own Tiptap extensions.
 *
 * @example
 * ```tsx
 * import { RichText } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<RichText
 * 		id="notes"
 * 		name="notes"
 * 		label={t("notes")}
 * 		value={notes()}
 * 		onChange={setNotes}
 * 		headings={false}
 * 	/>
 * );
 * ```
 */
const RichText: Component<RichTextProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [, ariaProps] = splitProps(props, [
		"id",
		"name",
		"value",
		"onChange",
		"label",
		"placeholder",
		"description",
		"errors",
		"required",
		"disabled",
		"headings",
		"bold",
		"italic",
		"underline",
		"strikethrough",
		"bulletList",
		"orderedList",
		"clearFormatting",
		"links",
		"extensions",
		"toolbarEnd",
		"labelStart",
		"labelEnd",
		"class",
	]);

	const options = createMemo<RichTextOptions>(() => ({
		headings: props.headings,
		bold: props.bold,
		italic: props.italic,
		underline: props.underline,
		strikethrough: props.strikethrough,
		bulletList: props.bulletList,
		orderedList: props.orderedList,
		clearFormatting: props.clearFormatting,
		links: { external: props.links !== false, internal: false },
		referenceControls: false,
		fullscreen: false,
	}));

	const { editor, setContainer } = useEditor({
		get value() {
			return props.value ?? null;
		},
		onChange: props.onChange,
		get disabled() {
			return props.disabled;
		},
		get options() {
			return options();
		},
		get extensions() {
			return props.extensions;
		},
	});

	// ----------------------------------------
	// Memos
	const showPlaceholder = createMemo(
		() => props.placeholder !== undefined && !richTextHasContent(props.value),
	);

	// ----------------------------------------
	// Render
	return (
		<Field.Root
			id={props.id}
			required={props.required}
			disabled={props.disabled}
			errors={props.errors}
			class={props.class}
		>
			<Show when={props.label !== undefined || props.labelEnd !== undefined}>
				<Field.Label start={props.labelStart} end={props.labelEnd}>
					{props.label}
				</Field.Label>
			</Show>
			<div
				data-rich-text
				class={classnames(
					"relative overflow-hidden rounded-md border border-border bg-input transition-colors duration-200 focus-within:border-primary",
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
							options={options()}
							fullscreen={false}
							onFullscreenChange={() => {}}
							end={props.toolbarEnd}
						/>
					)}
				</Show>
				<div class="relative">
					<Show when={showPlaceholder()}>
						<div class="pointer-events-none absolute top-3 left-3 z-10 text-sm text-muted">
							{props.placeholder || T()("editor.rich.text.placeholder")}
						</div>
					</Show>
					<div {...ariaProps} data-rich-text-control ref={setContainer} />
				</div>
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

export default RichText;
