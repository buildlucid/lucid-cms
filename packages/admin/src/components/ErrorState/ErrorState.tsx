import classnames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";
import T from "@/translations";

export interface ErrorStateProps {
	/** An image URL, or an element to show instead. */
	image?: string | JSXElement;
	/** @default "Something went wrong" */
	title?: string;
	description?: string;
	actions?: JSXElement;
	class?: string;
}

/**
 * A message for when something goes wrong, with optional actions.
 *
 * @example
 * ```tsx
 * import { Button, ErrorState } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 * import { getFieldError } from "@lucidcms/admin/utils";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<ErrorState
 * 		description={getFieldError(report.error)}
 * 		actions={<Button size="sm" onClick={() => report.refetch()}>{t("common.try.again")}</Button>}
 * 	/>
 * );
 * ```
 */
const ErrorState: Component<ErrorStateProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			data-error-state
			class={classnames("flex items-center justify-center", props.class)}
		>
			<div class="w-full max-w-xl px-4 py-8 text-center flex flex-col items-center md:px-6 md:py-10">
				<Show when={props.image}>
					{(image) => (
						<Show
							when={typeof image() === "string"}
							fallback={<div class="mb-6">{image() as JSXElement}</div>}
						>
							<img
								src={image() as string}
								class="h-auto mx-auto mb-6 max-w-xs w-full max-h-40 object-contain"
								alt=""
							/>
						</Show>
					)}
				</Show>
				<h2 class="mb-1 text-sm font-semibold">
					{props.title ?? T()("errors.generic.title")}
				</h2>
				<p class="max-w-96 text-sm">
					{props.description ?? T()("errors.generic.message")}
				</p>
				<Show when={props.actions}>
					<div class="mt-4 flex items-center gap-2">{props.actions}</div>
				</Show>
			</div>
		</div>
	);
};

export default ErrorState;
