import noPermission from "@assets/illustrations/no-permission.svg";
import notifySvg from "@assets/illustrations/notify.svg";
import classNames from "classnames";
import { type Component, type JSXElement, Match, Show, Switch } from "solid-js";
import Button from "@/components/Partials/Button";
import ErrorBlock from "@/components/Partials/ErrorBlock";
import Loading from "@/components/Partials/Loading";
import NoEntriesBlock from "@/components/Partials/NoEntriesBlock";
import type { QueryStateResponse } from "@/hooks/useQueryState";
import T from "@/translations";

export const DynamicContent: Component<{
	class?: string;
	state?: {
		isError?: boolean;
		isSuccess?: boolean;
		isEmpty?: boolean;
		isLoading?: boolean;
		hasPermission?: boolean;
		searchParams?: QueryStateResponse;
	};
	slot?: {
		/** The footer slot - can be used instead of the Layout footer slot if the footer needs state from the content. */
		footer?: JSXElement;
	};
	copy?: {
		noEntries?: {
			title?: string;
			description?: string;
			button?: string;
		};
		error?: {
			title?: string;
			description?: string;
		};
	};
	permissions?: {
		create?: boolean;
	};
	callback?: {
		createEntry?: () => void;
	};
	options?: {
		inline?: boolean;
		padding?: "16" | "24";
		hideNoEntries?: boolean;
	};
	children: JSXElement;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<>
			<div
				class={classNames("flex flex-col", props.class, {
					"p-4 md:p-6": props.options?.padding === "24",
					"p-4": props.options?.padding === "16",
					"flex-1 h-full": props.options?.inline !== true,
				})}
			>
				<Switch fallback={props.children}>
					<Match when={props.state?.isError}>
						<div class="flex-1 flex items-center justify-center">
							<ErrorBlock
								content={{
									image: notifySvg,
									title: props.copy?.error?.title,
									description: props.copy?.error?.description,
								}}
							/>
						</div>
					</Match>
					<Match
						when={props.state?.isEmpty && props.options?.hideNoEntries !== true}
					>
						<div class="flex-1 flex items-center justify-center">
							<Show when={!props.state?.searchParams?.hasFiltersApplied()}>
								<NoEntriesBlock
									copy={{
										title: props.copy?.noEntries?.title,
										description: props.copy?.noEntries?.description,
										button: props.copy?.noEntries?.button,
									}}
									callbacks={{
										action: props.callback?.createEntry,
									}}
									permissions={{
										create: props.permissions?.create,
									}}
								/>
							</Show>
							<Show when={props.state?.searchParams?.hasFiltersApplied()}>
								<ErrorBlock
									content={{
										title: T()("empty.states.results.title"),
										description: T()("empty.states.results.description"),
									}}
								>
									<Button
										type="submit"
										theme="primary"
										size="medium"
										onClick={() => {
											props.state?.searchParams?.resetFilters();
										}}
									>
										{T()("actions.reset.filters")}
									</Button>
								</ErrorBlock>
							</Show>
						</div>
					</Match>
					<Match when={props.state?.isLoading}>
						<div class="flex-1 flex items-center justify-center">
							<Loading />
						</div>
					</Match>
					<Match when={props.state?.hasPermission === false}>
						<ErrorBlock
							content={{
								image: noPermission,
								title: T()("permissions.denied.title"),
								description: T()("permissions.denied.description"),
							}}
						/>
					</Match>
					<Match when={props.state?.isSuccess}>{props.children}</Match>
				</Switch>
			</div>
			{props.slot?.footer}
		</>
	);
};
