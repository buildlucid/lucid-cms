import type { FieldError } from "@types";
import classNames from "classnames";
import { type Accessor, type Component, createMemo, For, Show } from "solid-js";
import { FieldErrorBadge } from "@/components/Partials/FieldErrorBadge";
import T from "@/translations";
import type { BrickPreviewField } from "@/utils/brick-preview-helpers";
import { countFieldErrors } from "@/utils/structural-field-helpers";
import type { RichTextOptions } from "../types";
import NodeActions from "./NodeActions";

export interface EmbeddedBrickNodeViewProps {
	refValue: unknown;
	available: boolean;
	label: string;
	brickKey?: string;
	summary?: string;
	previewFields: BrickPreviewField[];
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
	const previewFields = createMemo(() =>
		props.available ? props.previewFields.slice(0, 3) : [],
	);
	const hasPreviewFields = createMemo(() => previewFields().length > 0);
	const brickKey = createMemo(() =>
		props.available && props.brickKey !== props.label
			? props.brickKey
			: undefined,
	);
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
			<div class="min-w-0 grow overflow-hidden rounded-lg border border-border bg-input-base">
				<div
					class={classNames(
						"flex min-w-0 items-start justify-between gap-4 bg-card-base px-4 py-2.5",
						{ "border-border border-b": hasPreviewFields() },
					)}
				>
					<div class="min-w-0 grow">
						<div class="flex min-w-0 items-baseline gap-2">
							<p class="truncate text-sm font-medium text-title mb-0!">
								{props.available
									? props.label
									: T()("editor.rich.text.brick.unavailable")}
							</p>
							<Show when={brickKey()}>
								<span class="shrink-0 truncate font-mono text-[11px] text-unfocused">
									{brickKey()}
								</span>
							</Show>
						</div>
						<Show when={props.available && props.summary}>
							<p class="mt-0.5 line-clamp-2 text-xs text-subtitle mb-0!">
								{props.summary}
							</p>
						</Show>
						<Show when={hasErrors()}>
							<p class="mt-1 text-xs font-medium text-error-base mb-0!">
								{T()("editor.rich.text.brick.has.errors")}
							</p>
						</Show>
					</div>
					<Show when={hasErrors()}>
						<div class="flex shrink-0 items-start">
							<FieldErrorBadge count={errorCount()} compact />
						</div>
					</Show>
				</div>
				<Show when={hasPreviewFields()}>
					<dl class="min-w-0">
						<For each={previewFields()}>
							{(field, index) => (
								<div
									class={classNames(
										"flex min-w-0 items-center justify-between gap-4 px-4 py-2",
										{ "border-border border-t": index() > 0 },
									)}
									title={`${field.label}: ${field.value}`}
								>
									<dt class="min-w-0 truncate text-xs leading-5 font-medium text-unfocused">
										{field.label}
									</dt>
									<dd class="min-w-0 truncate text-right text-xs leading-5 text-subtitle">
										{field.value || "—"}
									</dd>
								</div>
							)}
						</For>
					</dl>
				</Show>
			</div>
			{props.isEditable() ? (
				<NodeActions
					editLabel={T()("editor.rich.text.brick.edit")}
					removeLabel={T()("editor.rich.text.brick.remove")}
					editDisabled={!props.available}
					showRemove
					onEdit={editBrick}
					onRemove={props.remove}
				/>
			) : null}
		</div>
	);
};

export default EmbeddedBrickNodeView;
