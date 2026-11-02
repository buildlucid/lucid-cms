import classnames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";

export type StateNoteVariant = "neutral" | "danger";

export interface StateNoteProps {
	/** @default "neutral" */
	variant?: StateNoteVariant;
	/** Shown at the end of the note, such as a small ghost button to try again. */
	action?: JSXElement;
	class?: string;
	children: JSXElement;
}

/**
 * A quiet one-line note for a card's empty or error state, in place of a full-size empty or error state.
 *
 * @example
 * ```tsx
 * import { Button, StateNote } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<StateNote
 * 		variant="danger"
 * 		action={<Button variant="ghost" size="xs" onClick={() => redirects.refetch()}>{t("common.try.again")}</Button>}
 * 	>
 * 		{t("redirects.load.failed")}
 * 	</StateNote>
 * );
 * ```
 */
const StateNote: Component<StateNoteProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			data-state-note
			role={props.variant === "danger" ? "alert" : undefined}
			class={classnames(
				"flex min-h-9 items-center gap-2.5 rounded-md px-3 py-1.5",
				{
					"bg-input": props.variant !== "danger",
					"bg-danger-low": props.variant === "danger",
				},
				props.class,
			)}
		>
			<StatusIndicator
				variant={props.variant === "danger" ? "danger" : "neutral"}
				size="xs"
			/>
			{/* sized here, as the base styles give every paragraph its own size and colour */}
			<p
				class={classnames("min-w-0 grow text-sm", {
					"text-subtitle": props.variant === "danger",
				})}
			>
				{props.children}
			</p>
			<Show when={props.action}>
				<div class="-my-1 -me-1.5 flex shrink-0 items-center gap-1">
					{props.action}
				</div>
			</Show>
		</div>
	);
};

export default StateNote;
