import classNames from "classnames";
import { FaSolidPen } from "solid-icons/fa";
import { type Component, Show } from "solid-js";
import Button from "@/components/Partials/Button";
import T from "@/translations";
import type { RichTextOptions } from "../types";

export interface EmbeddedBrickNodeViewProps {
	refValue: unknown;
	available: boolean;
	label: string;
	description: string;
	isEditable: () => boolean;
	editEmbeddedBrick?: NonNullable<
		RichTextOptions["callbacks"]
	>["editEmbeddedBrick"];
}

const EmbeddedBrickNodeView: Component<EmbeddedBrickNodeViewProps> = (
	props,
) => {
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
				"my-3 flex w-full select-none items-center gap-3 rounded-xl border bg-card-base p-3 text-left",
				{
					"border-border": props.available,
					"border-error-base/50 bg-linear-to-b from-error-base/10 to-card-base to-30%":
						!props.available,
				},
			)}
			data-lucid-rich-text-brick=""
		>
			<div
				class={classNames(
					"flex min-h-20 min-w-0 grow flex-col justify-center rounded-xl border bg-input-base px-5 py-4",
					{
						"border-border": props.available,
						"border-error-base/50": !props.available,
					},
				)}
			>
				<Show
					when={props.available}
					fallback={
						<span class="text-sm font-medium text-error-base">
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
				</Show>
			</div>
			<Button
				type="button"
				theme="circle"
				size="icon-subtle"
				onClick={editBrick}
				disabled={!props.available}
				aria-label={T()("editor.rich.text.brick.edit")}
				title={T()("editor.rich.text.brick.edit")}
			>
				<FaSolidPen size={12} />
			</Button>
		</div>
	);
};

export default EmbeddedBrickNodeView;
