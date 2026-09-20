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
import { Field } from "@/components/Field/Field";
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
	/** Shown while the editor is empty. */
	placeholder?: string;
	/** Sits under the control, and is read out alongside it. */
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
	/** Offers the clear formatting control. @default true */
	clearFormatting?: boolean;
	/** Offers the link control. @default true */
	links?: boolean;
	/**
	 * Extra Tiptap extensions, merged over the ones Lucid ships so you can add
	 * your own nodes or replace ours by name. Read once, when the editor is
	 * created.
	 */
	extensions?: Extensions;
	/**
	 * Rendered at the end of the toolbar, after the built in controls. Pair it
	 * with `extensions` to give a node of your own a button.
	 */
	toolbarEnd?: JSXElement;
	/** Before the label text, for an icon or badge. */
	labelStart?: JSXElement;
	/** After the label, against the right edge. */
	labelEnd?: JSXElement;
	/** Applied to the field. Target [data-rich-text-control] for the editor. */
	class?: string;
}

/**
 * A rich text editor for prose, with a formatting toolbar and links. Every
 * control is on unless you turn it off, and turning them all off drops the
 * toolbar and the selection pill with them. Pass `extensions` to add your own
 * Tiptap nodes alongside the ones Lucid ships.
 *
 * @example
 * ```tsx
 * import { RichText } from "@lucidcms/admin/components";
 *
 * return (
 * 	<RichText
 * 		id="comment"
 * 		name="comment"
 * 		label="Comment"
 * 		headings={false}
 * 		value={comment()}
 * 		onChange={setComment}
 * 	/>
 * );
 * ```
 */
export const RichText: Component<RichTextProps> = (props) => {
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

	/**
	 * The shared editor still speaks in options, but only the formatting half of
	 * them is worth exposing. Everything to do with resolving CMS references
	 * belongs to DocumentRichText.
	 */
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
					"relative overflow-hidden rounded-md border border-border bg-input-base transition-colors duration-200 focus-within:border-primary-base",
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
						<div class="pointer-events-none absolute top-3 left-3 z-10 text-sm text-unfocused">
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
