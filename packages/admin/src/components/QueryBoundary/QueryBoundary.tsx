import classnames from "classnames";
import { TbOutlineAlertTriangle, TbOutlineFilterOff } from "solid-icons/tb";
import { type Component, type JSXElement, Match, Switch } from "solid-js";
import Button from "@/components/Button/Button";
import CardState from "@/components/CardState/CardState";
import EmptyState from "@/components/EmptyState/EmptyState";
import ErrorState from "@/components/ErrorState/ErrorState";
import Skeleton from "@/components/Skeleton/Skeleton";
import StateNote from "@/components/StateNote/StateNote";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import T from "@/translations";

/**
 * - `page`: full-size states, centred in the space the content would take.
 * - `inline`: one-line `StateNote`s, for boundaries inside a card.
 * - `card`: `inline`, drawn in a card, for boundaries that stand in for one, such as in an `InfoRow`.
 * - `contained`: taller `CardState`s, for boundaries that fill a card with no heading above them, such as an
 *   `InfoRow.Content` with `padding="none"`.
 */
export type QueryBoundaryAppearance = "page" | "inline" | "card" | "contained";

export interface QueryBoundaryProps {
	loading?: boolean;
	error?: boolean;
	empty?: boolean;
	/** When filters are applied, shows a "no results" state with a reset button. */
	queryState?: QueryStateResponse;
	/** Replaces the default filter reset. */
	onResetFilters?: () => void;
	/** Adds a "Try again" button to the default error state. */
	onRetry?: () => void;
	/**
	 * Skeleton shapes sized like the content, built from `.skeleton` blocks. They are wrapped in `Skeleton`, which
	 * announces loading. Without them, a heading and a few lines are shown.
	 */
	loadingFallback?: JSXElement;
	errorFallback?: JSXElement;
	/** For the `inline` and `card` appearances, pass a `StateNote`, and for `contained`, a `CardState`. */
	emptyFallback?: JSXElement;
	/** @default "page" */
	appearance?: QueryBoundaryAppearance;
	class?: string;
	children: JSXElement;
}

/**
 * Shows a loading skeleton, error or empty state in place of its children.
 *
 * @example
 * ```tsx
 * import { QueryBoundary, StateNote } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<QueryBoundary
 * 		loading={redirects.isLoading}
 * 		error={redirects.isError}
 * 		empty={redirects.data?.data.length === 0}
 * 		queryState={queryState}
 * 		onRetry={() => redirects.refetch()}
 * 		appearance="inline"
 * 		emptyFallback={<StateNote>{t("redirects.empty")}</StateNote>}
 * 	>
 * 		<RedirectsTable redirects={redirects.data?.data} />
 * 	</QueryBoundary>
 * );
 * ```
 */
const QueryBoundary: Component<QueryBoundaryProps> = (props) => {
	// ----------------------------------------
	// Functions
	const filtered = () => props.queryState?.filtersAreDefault() === false;
	const page = () =>
		props.appearance === undefined || props.appearance === "page";
	const contained = () => props.appearance === "contained";
	/** Picks the value for the current appearance. `card` uses the `inline` one, in a frame. */
	const byAppearance = <T,>(
		values: Record<"page" | "inline" | "contained", () => T>,
	) => values[page() ? "page" : contained() ? "contained" : "inline"]();
	const resetFilters = () =>
		props.onResetFilters
			? props.onResetFilters()
			: props.queryState?.resetFilters();
	const frame = (children: JSXElement) => (
		<div
			class={classnames({
				"flex flex-1 items-center justify-center": page(),
				"rounded-md border border-border bg-card p-4":
					props.appearance === "card",
			})}
		>
			{children}
		</div>
	);
	const stateButton = (label: string, onClick: () => void) => (
		<Button
			type="button"
			variant={byAppearance({
				page: () => "primary",
				inline: () => "ghost",
				contained: () => "outline",
			})}
			size={page() || contained() ? "sm" : "xs"}
			onClick={onClick}
		>
			{label}
		</Button>
	);
	const retryButton = () =>
		props.onRetry
			? stateButton(T()("common.try.again"), props.onRetry)
			: undefined;

	// ----------------------------------------
	// Render
	return (
		<div data-query-boundary class={classnames("flex flex-col", props.class)}>
			<Switch fallback={props.children}>
				<Match when={props.loading}>
					<Skeleton class="flex flex-1 flex-col">
						{props.loadingFallback}
					</Skeleton>
				</Match>
				<Match when={props.error}>
					{frame(
						props.errorFallback ??
							byAppearance({
								page: () => (
									<ErrorState
										icon={<TbOutlineAlertTriangle />}
										actions={retryButton()}
									/>
								),
								inline: () => (
									<StateNote variant="danger" action={retryButton()}>
										{T()("states.load.failed")}
									</StateNote>
								),
								contained: () => (
									<CardState
										variant="danger"
										icon={<TbOutlineAlertTriangle />}
										title={T()("errors.generic.title")}
										description={T()("states.load.failed")}
										action={retryButton()}
									/>
								),
							}),
					)}
				</Match>
				<Match when={props.empty && filtered()}>
					{frame(
						byAppearance({
							page: () => (
								<ErrorState
									title={T()("empty.states.results.title")}
									description={T()("empty.states.results.description")}
									actions={stateButton(
										T()("actions.reset.filters"),
										resetFilters,
									)}
								/>
							),
							inline: () => (
								<StateNote
									action={stateButton(
										T()("actions.reset.filters"),
										resetFilters,
									)}
								>
									{T()("states.results.none")}
								</StateNote>
							),
							contained: () => (
								<CardState
									icon={<TbOutlineFilterOff />}
									title={T()("empty.states.results.title")}
									description={T()("empty.states.results.description")}
									action={stateButton(
										T()("actions.reset.filters"),
										resetFilters,
									)}
								/>
							),
						}),
					)}
				</Match>
				<Match when={props.empty}>
					{frame(
						props.emptyFallback ??
							byAppearance({
								page: () => <EmptyState />,
								inline: () => <StateNote>{T()("states.empty")}</StateNote>,
								contained: () => (
									<CardState
										title={T()("empty.states.entries.title")}
										description={T()("states.empty")}
									/>
								),
							}),
					)}
				</Match>
			</Switch>
		</div>
	);
};

export default QueryBoundary;
