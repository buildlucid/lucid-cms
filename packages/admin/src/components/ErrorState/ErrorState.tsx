import classnames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";
import T from "@/translations";

export interface ErrorStateProps {
	/** An illustration's src, or an element to render in its place. */
	image?: string | JSXElement;
	/** @default "Something went wrong" */
	title?: string;
	description?: string;
	/** A way out of the error, normally a Link back to safety. */
	actions?: JSXElement;
	class?: string;
}

/**
 * The message shown in place of content that could not be loaded, or that the
 * reader is not allowed to see.
 *
 * @example
 * ```tsx
 * import { ErrorState, Link } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<ErrorState
 * 		title={t("errors.generic.title")}
 * 		description={t("errors.generic.message")}
 * 		actions={
 * 			<Link variant="primary" size="sm" href="/lucid">
 * 				{t("common.dashboard")}
 * 			</Link>
 * 		}
 * 	/>
 * );
 * ```
 */
const ErrorState: Component<ErrorStateProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div class={classnames("flex items-center justify-center", props.class)}>
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
