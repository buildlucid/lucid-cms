import type { FieldError } from "@types";
import classNames from "classnames";
import { FaSolidCubes } from "solid-icons/fa";
import { type Accessor, type Component, createMemo, Show } from "solid-js";
import { FieldErrorBadge } from "@/components/Partials/FieldErrorBadge";
import T from "@/translations";
import { countFieldErrors } from "@/utils/structural-field-helpers";
import type { RichTextOptions } from "../types";
import NodeActions from "./NodeActions";

export interface EmbeddedBrickNodeViewProps {
	refValue: unknown;
	available: boolean;
	label: string;
	description: string;
	isEditable: () => boolean;
	remove: () => void;
	errors: Accessor<FieldError[]>;
	editEmbeddedBrick?: NonNullable<
		RichTextOptions["callbacks"]
	>["editEmbeddedBrick"];
}

const EmbeddedBrickNodeView: Component<EmbeddedBrickNodeViewProps> = (
	props,
) => {
	// -------------------------------
	// Memos
	const errorCount = createMemo(() => countFieldErrors(props.errors()));
	const hasErrors = createMemo(() => errorCount() > 0);

	// -------------------------------
	// Functions
	const editBrick = (event: MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();
		if (
			!props.isEditable() ||
			typeof props.refValue !== "string" ||
			!props.available
		) {
			return;
		}
		props.editEmbeddedBrick?.(props.refValue);
	};

	// -------------------------------
	// Render
	return (
		<div
			contentEditable={false}
			class={classNames(
				"group my-3 flex w-full select-none items-center gap-3 rounded-xl border bg-card-base p-3 text-left transition-[border-color,box-shadow,background-color] duration-150 hover:border-primary-muted-border [&.ProseMirror-selectednode]:border-primary-base [&.ProseMirror-selectednode]:ring-2 [&.ProseMirror-selectednode]:ring-primary-base/20",
				{
					"border-border": props.available && !hasErrors(),
					"border-error-base/50 bg-linear-to-b from-error-base/10 to-card-base to-30%":
						!props.available || hasErrors(),
				},
			)}
			data-lucid-rich-text-brick=""
		>
			<div
				class={classNames(
					"flex min-h-20 min-w-0 grow items-center gap-4 rounded-xl border bg-input-base px-5 py-4",
					{
						"border-border": props.available && !hasErrors(),
						"border-error-base/50": !props.available || hasErrors(),
					},
				)}
			>
				<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-card-base text-icon-base">
					<FaSolidCubes size={18} />
				</div>
				<div class="flex min-w-0 grow flex-col justify-center">
					<Show
						when={props.available}
						fallback={
							<span class="text-xs font-medium text-error-base">
								{T()("editor.rich.text.brick.unavailable")}
							</span>
						}
					>
						<Show when={props.label}>
							{(label) => (
								<span class="text-sm font-medium text-title">{label()}</span>
							)}
						</Show>
						<Show when={props.description}>
							{(description) => (
								<span class="mt-1 line-clamp-2 text-sm text-subtitle">
									{description()}
								</span>
							)}
						</Show>
						<Show when={hasErrors()}>
							<span class="mt-2 text-xs font-medium text-error-base">
								{T()("editor.rich.text.brick.has.errors")}
							</span>
						</Show>
					</Show>
				</div>
				<FieldErrorBadge count={errorCount()} compact />
			</div>
			<NodeActions
				editLabel={T()("editor.rich.text.brick.edit")}
				removeLabel={T()("editor.rich.text.brick.remove")}
				editDisabled={!props.available || !props.isEditable()}
				showRemove={props.isEditable()}
				onEdit={editBrick}
				onRemove={props.remove}
			/>
		</div>
	);
};

export default EmbeddedBrickNodeView;
