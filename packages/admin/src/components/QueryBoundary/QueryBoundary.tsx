import notifySvg from "@assets/illustrations/notify.svg?url";
import classnames from "classnames";
import { type Component, type JSXElement, Match, Switch } from "solid-js";
import Button from "@/components/Button/Button";
import EmptyState from "@/components/EmptyState/EmptyState";
import ErrorState from "@/components/ErrorState/ErrorState";
import LoadingState from "@/components/LoadingState/LoadingState";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import T from "@/translations";

export interface QueryBoundaryProps {
	isLoading?: boolean;
	isError?: boolean;
	isEmpty?: boolean;
	/**
	 * Swaps the empty state for a no results one, with a way to clear the
	 * filters, whenever the query has filters applied.
	 */
	queryState?: QueryStateResponse;
	/** Clears the filters from the no results state. @default queryState.resetFilters */
	onResetFilters?: () => void;
	/** Replaces the default spinner. */
	loading?: JSXElement;
	/** Replaces the default error state. */
	error?: JSXElement;
	/** Replaces the default empty state. */
	empty?: JSXElement;
	class?: string;
	children: JSXElement;
}

/**
 * Shows a spinner, an error, an empty state or the content, based on where a
 * query has got to. Pass a state of your own to replace any of the defaults.
 *
 * @example
 * ```tsx
 * import { Button, EmptyState, QueryBoundary } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<QueryBoundary
 * 		isLoading={reports.isLoading}
 * 		isError={reports.isError}
 * 		isEmpty={reports.data?.data.length === 0}
 * 		queryState={queryState}
 * 		empty={
 * 			<EmptyState
 * 				title={t("empty.states.entries.title")}
 * 				actions={<Button size="sm" onClick={run}>{t("common.create")}</Button>}
 * 			/>
 * 		}
 * 	>
 * 		<ReportTable />
 * 	</QueryBoundary>
 * );
 * ```
 */
const QueryBoundary: Component<QueryBoundaryProps> = (props) => {
	// ----------------------------------------
	// Functions
	//* filters that match nothing are a different problem to having no entries
	const filtered = () => props.queryState?.hasFiltersApplied() === true;
	const centred = (children: JSXElement) => (
		<div class="flex flex-1 items-center justify-center">{children}</div>
	);

	// ----------------------------------------
	// Render
	return (
		<div data-query-boundary class={classnames("flex flex-col", props.class)}>
			<Switch fallback={props.children}>
				<Match when={props.isLoading}>
					{centred(props.loading ?? <LoadingState />)}
				</Match>
				<Match when={props.isError}>
					{centred(props.error ?? <ErrorState image={notifySvg} />)}
				</Match>
				<Match when={props.isEmpty && filtered()}>
					{centred(
						<ErrorState
							title={T()("empty.states.results.title")}
							description={T()("empty.states.results.description")}
							actions={
								<Button
									type="button"
									variant="primary"
									size="sm"
									onClick={() =>
										props.onResetFilters
											? props.onResetFilters()
											: props.queryState?.resetFilters()
									}
								>
									{T()("actions.reset.filters")}
								</Button>
							}
						/>,
					)}
				</Match>
				<Match when={props.isEmpty}>
					{centred(props.empty ?? <EmptyState />)}
				</Match>
			</Switch>
		</div>
	);
};

export default QueryBoundary;
