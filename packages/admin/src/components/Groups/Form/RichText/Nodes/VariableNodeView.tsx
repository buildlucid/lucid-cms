import type { FieldError } from "@types";
import classNames from "classnames";
import { FaSolidTriangleExclamation } from "solid-icons/fa";
import { type Accessor, type Component, createMemo, Show } from "solid-js";
import T from "@/translations";
import { resolveFieldErrorMessage } from "@/utils/error-helpers";
import type { RichTextOptions, RichTextVariableSelection } from "../types";

export interface VariableNodeViewProps {
	collectionKey: unknown;
	documentId: unknown;
	fieldKey: unknown;
	value: string;
	available: boolean;
	errors: Accessor<FieldError[]>;
	isEditable: () => boolean;
	getPos: () => number | undefined;
	setSelection: (
		position: number,
		selection: RichTextVariableSelection,
	) => void;
	selectVariable?: NonNullable<RichTextOptions["callbacks"]>["selectVariable"];
}

const VariableNodeView: Component<VariableNodeViewProps> = (props) => {
	// -------------------------------
	// Memos
	const hasErrors = createMemo(() => props.errors().length > 0);
	const errorMessage = createMemo(() => {
		const message = props.errors()[0]?.message;
		return message ? resolveFieldErrorMessage(message) : undefined;
	});

	// -------------------------------
	// Functions
	const editVariable = (event: MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();
		if (
			!props.isEditable() ||
			typeof props.collectionKey !== "string" ||
			typeof props.documentId !== "number" ||
			typeof props.fieldKey !== "string"
		) {
			return;
		}
		const position = props.getPos();
		if (typeof position !== "number") return;

		props.selectVariable?.({
			current: {
				collectionKey: props.collectionKey,
				documentId: props.documentId,
				fieldKey: props.fieldKey,
			},
			onSelect: (selection) => props.setSelection(position, selection),
		});
	};

	// -------------------------------
	// Render
	return (
		<span
			contentEditable={false}
			class={classNames(
				"mx-0.5 inline-flex select-none items-center gap-1 rounded-full border py-0.5 pr-1 pl-2 align-baseline text-sm",
				{
					"border-primary-muted-border bg-primary-muted-bg text-primary-muted-contrast":
						props.available && !hasErrors(),
					"border-error-base/30 bg-error-base/10 text-error-base":
						!props.available || hasErrors(),
				},
			)}
			data-lucid-rich-text-variable=""
			title={errorMessage()}
		>
			<Show when={hasErrors()}>
				<FaSolidTriangleExclamation size={10} class="shrink-0" />
			</Show>
			<span class="text-current">
				{props.value ||
					String(
						props.fieldKey ?? T()("editor.rich.text.variable.unavailable"),
					)}
			</span>
			<button
				type="button"
				class="shrink-0 cursor-pointer select-none rounded-full px-1.5 py-0.5 text-xs text-current hover:bg-current/10 focus-visible:outline-2 focus-visible:outline-current"
				onClick={editVariable}
				aria-label={T()("editor.rich.text.variable.edit")}
			>
				{T()("common.edit")}
			</button>
		</span>
	);
};

export default VariableNodeView;
