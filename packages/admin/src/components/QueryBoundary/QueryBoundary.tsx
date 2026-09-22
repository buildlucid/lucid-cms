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
	loading?: boolean;
	error?: boolean;
	empty?: boolean;
	/** When filters are applied, shows a "no results" state with a reset button. */
	queryState?: QueryStateResponse;
	/** Replaces the default filter reset. */
	onResetFilters?: () => void;
	loadingFallback?: JSXElement;
	errorFallback?: JSXElement;
	emptyFallback?: JSXElement;
	class?: string;
	children: JSXElement;
}

/**
 * Shows a loading, error or empty state in place of its children.
 *
 * @example
 * ```tsx
 * import { QueryBoundary } from "@lucidcms/admin/components";
 *
 * return (
 * 	<QueryBoundary
 * 		loading={redirects.isLoading}
 * 		error={redirects.isError}
 * 		empty={redirects.data?.data.length === 0}
 * 		queryState={queryState}
 * 	>
 * 		<RedirectsTable redirects={redirects.data?.data} />
 * 	</QueryBoundary>
 * );
 * ```
 */
const QueryBoundary: Component<QueryBoundaryProps> = (props) => {
	// ----------------------------------------
	// Functions
	const filtered = () => props.queryState?.hasFiltersApplied() === true;
	const centred = (children: JSXElement) => (
		<div class="flex flex-1 items-center justify-center">{children}</div>
	);

	// ----------------------------------------
	// Render
	return (
		<div data-query-boundary class={classnames("flex flex-col", props.class)}>
			<Switch fallback={props.children}>
				<Match when={props.loading}>
					{centred(props.loadingFallback ?? <LoadingState />)}
				</Match>
				<Match when={props.error}>
					{centred(props.errorFallback ?? <ErrorState image={notifySvg} />)}
				</Match>
				<Match when={props.empty && filtered()}>
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
				<Match when={props.empty}>
					{centred(props.emptyFallback ?? <EmptyState />)}
				</Match>
			</Switch>
		</div>
	);
};

export default QueryBoundary;
