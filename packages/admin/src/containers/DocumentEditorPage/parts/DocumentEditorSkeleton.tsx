import classNames from "classnames";
import { type Component, Match, Show, Switch } from "solid-js";
import { PreviewLoading } from "@/components/DocumentPreview/parts/PreviewLoading";
import Skeleton from "@/components/Skeleton/Skeleton";
import FieldsSkeleton from "./FieldsSkeleton";

/** What the builder shows beside its fields, which the skeleton sketches. */
export type DocumentEditorSkeletonLayout = "fields" | "preview" | "compare";

type DocumentEditorSkeletonProps =
	| {
			/** @default "fields" */
			layout?: "fields";
			/** The details column beside the fields, where it shows. */
			details?: "open" | "collapsed";
	  }
	| { layout: "compare" }
	| {
			layout: "preview";
			/** The fields column's width beside the preview. */
			fieldsWidth: number;
	  };

/**
 * Loading skeleton matching the editor's layouts: the editing header and its card below, or, while
 * previewing, one card whose header splits over the fields and the preview.
 */
const DocumentEditorSkeleton: Component<DocumentEditorSkeletonProps> = (
	props,
) => {
	// ----------------------------------------
	// Memos
	const preview = () => (props.layout === "preview" ? props : undefined);
	const details = () =>
		props.layout === undefined || props.layout === "fields"
			? props.details
			: undefined;

	// ----------------------------------------
	// Render
	return (
		<Skeleton class="flex grow flex-col">
			<Show
				when={preview()}
				fallback={
					<>
						<div class="@container/builder-header rounded-b-xl border-x border-b border-border bg-background md:-mt-4 max-md:mt-px max-md:rounded-t-xl max-md:border-t">
							<div class="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-4 py-3 md:px-6 @3xl/builder-header:h-17 @3xl/builder-header:flex-nowrap @3xl/builder-header:py-0">
								<div class="flex min-w-0 basis-full flex-col gap-1.5 @3xl/builder-header:flex-1 @3xl/builder-header:basis-auto">
									<span class="skeleton block h-6 w-44 max-w-full" />
									<span class="skeleton hidden h-3 w-32 @3xl/builder-header:block" />
								</div>
								<span class="skeleton block size-7 shrink-0" />
								<span class="skeleton block size-7 shrink-0" />
								<span class="skeleton block h-7 w-14 shrink-0" />
								<span class="skeleton block h-7 w-24 shrink-0" />
								<span class="skeleton ms-auto block h-8 w-20 shrink-0 @3xl/builder-header:ms-0" />
							</div>
						</div>
						<div class="mt-4 flex min-h-[60vh] grow flex-col overflow-hidden rounded-xl border border-border bg-background md:mb-4">
							<Switch
								fallback={
									<div class="flex flex-1">
										<div class="min-w-0 flex-1">
											<FieldsSkeleton />
										</div>
										<Show when={details()}>
											{(state) => (
												<div
													class={classNames(
														"hidden shrink-0 border-s border-border bg-card content-lg:block",
														state() === "open" ? "w-82.5" : "w-10",
													)}
												/>
											)}
										</Show>
									</div>
								}
							>
								<Match when={props.layout === "compare"}>
									<div
										aria-hidden="true"
										class="flex h-11 shrink-0 items-center gap-3 border-b border-border px-4 md:px-6"
									>
										<span class="skeleton block h-6 w-36" />
										<span class="skeleton ms-auto block h-6 w-36" />
									</div>
									<div class="flex min-h-0 flex-1">
										<div class="w-1/2 shrink-0">
											<FieldsSkeleton />
										</div>
										<div class="min-w-0 flex-1 border-s border-border">
											<FieldsSkeleton />
										</div>
									</div>
								</Match>
							</Switch>
						</div>
					</>
				}
			>
				{(layout) => (
					<div class="mb-2 flex h-[calc(100dvh-0.5rem)] flex-col overflow-hidden rounded-b-lg border-x border-b border-border bg-background md:-mt-4">
						<div class="flex h-13 shrink-0 border-b border-border">
							<div
								class="flex shrink-0 items-center gap-2 border-e border-border ps-4 pe-2 md:ps-6"
								style={{ width: `${layout().fieldsWidth + 1}px` }}
							>
								<span class="skeleton block h-6 w-32 max-w-full" />
								<span class="skeleton ms-auto block h-7 w-14 shrink-0" />
							</div>
							<div class="flex min-w-0 flex-1 items-center gap-2 ps-2 pe-3 md:pe-4">
								<span class="skeleton block h-7 w-28 shrink-0" />
								<span class="skeleton ms-auto block h-7 w-24 shrink-0" />
								<span class="skeleton block h-8 w-20 shrink-0" />
							</div>
						</div>
						<div class="flex min-h-0 flex-1">
							<div
								class="shrink-0 overflow-hidden"
								style={{ width: `${layout().fieldsWidth}px` }}
							>
								<FieldsSkeleton />
							</div>
							<span aria-hidden="true" class="w-px shrink-0 bg-border" />
							<div aria-hidden="true" class="relative min-w-0 flex-1">
								<PreviewLoading />
							</div>
						</div>
					</div>
				)}
			</Show>
		</Skeleton>
	);
};

export default DocumentEditorSkeleton;
