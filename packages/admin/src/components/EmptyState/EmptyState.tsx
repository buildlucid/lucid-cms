import classnames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";
import T from "@/translations";

export interface EmptyStateProps {
	/** @default "No entries found" */
	title?: string;
	description?: string;
	/** A way to put the first entry there, normally a Button. */
	actions?: JSXElement;
	class?: string;
}

/**
 * The message shown in place of a list that has nothing in it, with an
 * optional action for putting the first entry there.
 *
 * @example
 * ```tsx
 * import { Button, EmptyState } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<EmptyState
 * 		title={t("empty.states.entries.title")}
 * 		description={t("empty.states.entries.description")}
 * 		actions={
 * 			<Button size="sm" onClick={create}>
 * 				{t("common.create")}
 * 			</Button>
 * 		}
 * 	/>
 * );
 * ```
 */
const EmptyState: Component<EmptyStateProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			class={classnames(
				"flex items-center justify-center px-4 py-8 md:px-6 md:py-10",
				props.class,
			)}
		>
			<div class="text-center flex flex-col items-center">
				<h2 class="mb-1 text-sm font-semibold">
					{props.title || T()("empty.states.entries.title")}
				</h2>
				<p class="max-w-96 text-sm">
					{props.description || T()("empty.states.entries.description")}
				</p>
				<Show when={props.actions}>
					<div class="mt-4 flex items-center gap-2">{props.actions}</div>
				</Show>
			</div>
		</div>
	);
};

export default EmptyState;
