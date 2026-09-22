import classnames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";
import Spinner, { type SpinnerSize } from "@/components/Spinner/Spinner";
import T from "@/translations";

export interface LoadingStateProps {
	/** @default "Loading" */
	title?: string;
	description?: string;
	actions?: JSXElement;
	/** @default "md" */
	size?: SpinnerSize;
	class?: string;
}

/**
 * A spinner with a message, for when content is loading.
 *
 * @example
 * ```tsx
 * import { LoadingState } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return <LoadingState description={t("reports.building")} />;
 * ```
 */
const LoadingState: Component<LoadingStateProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			data-loading-state
			class={classnames(
				"flex items-center justify-center px-4 py-8 md:px-6 md:py-10",
				props.class,
			)}
			role="status"
			aria-live="polite"
		>
			<div class="flex flex-col items-center text-center">
				{/* the heading already says it, so the spinner's own label would double up */}
				<span aria-hidden="true">
					<Spinner size={props.size} />
				</span>
				<h2 class="mt-3 mb-1 text-sm font-semibold">
					{props.title || T()("common.loading")}
				</h2>
				<Show when={props.description}>
					<p class="max-w-96 text-sm">{props.description}</p>
				</Show>
				<Show when={props.actions}>
					<div class="mt-4 flex items-center gap-2">{props.actions}</div>
				</Show>
			</div>
		</div>
	);
};

export default LoadingState;
