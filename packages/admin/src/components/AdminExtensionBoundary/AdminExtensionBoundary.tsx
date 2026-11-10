import classNames from "classnames";
import {
	ErrorBoundary,
	Match,
	type ParentComponent,
	Show,
	Suspense,
	Switch,
} from "solid-js";
import ErrorState from "@/components/ErrorState/ErrorState";
import PageLayout from "@/components/PageLayout/PageLayout";
import StatusIndicator, {
	type StatusIndicatorSize,
} from "@/components/StatusIndicator/StatusIndicator";
import T from "@/translations";

const indicatorStyles = {
	cell: { size: "sm", class: "gap-2 text-sm text-subtitle" },
	header: { size: "xs", class: "gap-1.5 text-xs leading-4 text-muted" },
} satisfies Record<string, { size: StatusIndicatorSize; class: string }>;

/**
 * Keeps a failed extension from removing the surrounding editor or admin layout. Pages wait for
 * their code behind the empty page frame; slots show nothing until theirs loads.
 */
const AdminExtensionBoundary: ParentComponent<{
	name: string;
	placement: keyof typeof indicatorStyles | "content" | "page";
}> = (props) => {
	// ----------------------------------
	// Functions
	const message = () => T()("admin.extension.failed", { name: props.name });
	const indicatorStyle = () =>
		props.placement === "content" || props.placement === "page"
			? undefined
			: indicatorStyles[props.placement];

	// ----------------------------------
	// Render
	return (
		<ErrorBoundary
			fallback={(error) => {
				console.error(message(), error);
				return (
					<Switch>
						<Match when={indicatorStyle()}>
							{(style) => (
								<span
									role="status"
									title={message()}
									class={classNames(
										"inline-flex max-w-full min-w-0 items-center align-middle",
										style().class,
									)}
								>
									<StatusIndicator
										variant="danger-subtle"
										size={style().size}
									/>
									<span class="truncate" aria-hidden="true">
										{T()("admin.extension.unavailable")}
									</span>
									<span class="sr-only">{message()}</span>
								</span>
							)}
						</Match>
						<Match when={props.placement === "content"}>
							<div
								role="status"
								class="flex min-w-0 items-start gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-sm text-muted"
							>
								<span class="flex h-5 shrink-0 items-center">
									<StatusIndicator variant="danger-subtle" />
								</span>
								<span class="min-w-0 wrap-anywhere">{message()}</span>
							</div>
						</Match>
						<Match when={props.placement === "page"}>
							<ErrorState class="h-full" description={message()} />
						</Match>
					</Switch>
				);
			}}
		>
			{/* only pages wait behind a boundary, showing the empty frame core pages show while their code
			loads. Slots render nothing until their code loads, and a boundary would also hide them whenever
			a query they read loads, so they couldn't show their own placeholder */}
			<Show when={props.placement === "page"} fallback={props.children}>
				<Suspense fallback={<PageLayout.Root />}>{props.children}</Suspense>
			</Show>
		</ErrorBoundary>
	);
};

export default AdminExtensionBoundary;
