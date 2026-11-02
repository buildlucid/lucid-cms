import classnames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";

export type CardStateVariant = "neutral" | "danger";

export interface CardStateProps {
	/** @default "neutral" */
	variant?: CardStateVariant;
	/** Shown in a round tile above the title, such as the icon the card's rows use. */
	icon?: JSXElement;
	title: string;
	description?: string;
	/** Shown under the description, such as a button to try again. */
	action?: JSXElement;
	class?: string;
}

/**
 * A centred empty or error state that fills a card in place of its content. It's taller than a `StateNote`, for cards
 * with no heading above their content, such as an `InfoRow.Content` with `padding="none"`.
 *
 * @example
 * ```tsx
 * import { CardState, InfoRow, QueryBoundary } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 * import { TbOutlineArrowRight } from "solid-icons/tb";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<InfoRow.Content padding="none">
 * 		<QueryBoundary
 * 			appearance="contained"
 * 			error={redirects.isError}
 * 			empty={redirects.data?.data.length === 0}
 * 			onRetry={() => redirects.refetch()}
 * 			emptyFallback={
 * 				<CardState
 * 					icon={<TbOutlineArrowRight />}
 * 					title={t("redirects.empty.title")}
 * 					description={t("redirects.empty.description")}
 * 				/>
 * 			}
 * 		>
 * 			<RedirectRows redirects={redirects.data?.data} />
 * 		</QueryBoundary>
 * 	</InfoRow.Content>
 * );
 * ```
 */
const CardState: Component<CardStateProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			data-card-state
			role={props.variant === "danger" ? "alert" : undefined}
			class={classnames(
				"flex flex-col items-center px-5 py-10 text-center",
				props.class,
			)}
		>
			<Show when={props.icon}>
				<span
					class={classnames(
						"mb-3 flex size-10 items-center justify-center rounded-full border [&_svg]:size-4",
						{
							"border-border bg-input text-icon": props.variant !== "danger",
							"border-danger-low-border bg-danger-low text-danger-low-foreground":
								props.variant === "danger",
						},
					)}
				>
					{props.icon}
				</span>
			</Show>
			<h3 class="text-sm font-medium">{props.title}</h3>
			<Show when={props.description}>
				<p class="mt-1 max-w-sm text-sm">{props.description}</p>
			</Show>
			<Show when={props.action}>
				<div class="mt-4 flex items-center gap-2">{props.action}</div>
			</Show>
		</div>
	);
};

export default CardState;
