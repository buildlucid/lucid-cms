import { type Component, Match, Switch } from "solid-js";
import { PreviewLoading } from "@/components/DocumentPreview/parts/PreviewLoading";
import Skeleton from "@/components/Skeleton/Skeleton";
import FieldsSkeleton from "./FieldsSkeleton";

/** What the builder shows beside its fields, which the skeleton sketches. */
export type DocumentEditorSkeletonLayout =
	| "fields"
	| "details"
	| "preview"
	| "compare";

type DocumentEditorSkeletonProps =
	| {
			/** @default "fields" */
			layout?: Exclude<DocumentEditorSkeletonLayout, "preview">;
	  }
	| {
			layout: "preview";
			/** The fields column's width beside the preview. */
			fieldsWidth: number;
	  };

/** Loading skeleton matching the editor's fields, details, preview or comparison layout. */
const DocumentEditorSkeleton: Component<DocumentEditorSkeletonProps> = (
	props,
) => {
	// ----------------------------------------
	// Render
	return (
		<Skeleton class="flex grow flex-col md:h-[calc(100dvh-1rem)] md:grow-0">
			<div class="@container/builder-header rounded-b-xl border-x border-b border-border bg-background md:-mt-4 max-md:mt-px max-md:rounded-t-xl max-md:border-t">
				<div class="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-4 py-3 md:px-6 @3xl/builder-header:h-14 @3xl/builder-header:flex-nowrap @3xl/builder-header:py-0">
					<div class="flex min-h-9 min-w-0 flex-1 items-center">
						<span class="skeleton block h-6 w-44 max-w-full" />
					</div>
					<div class="flex shrink-0 items-center gap-2">
						<span class="skeleton block size-7" />
						<span class="skeleton block size-7" />
						<span class="skeleton block size-7" />
					</div>
					<span class="skeleton block size-7 shrink-0 @3xl/builder-header:order-last" />
					<span class="basis-full @3xl/builder-header:hidden" />
					<span class="skeleton block h-9 min-w-0 flex-1 @3xl/builder-header:w-44 @3xl/builder-header:flex-none" />
					<span class="skeleton block h-9 w-24 shrink-0" />
				</div>
			</div>
			<div class="mt-2 mb-4 flex min-h-[60vh] grow flex-col overflow-hidden rounded-xl border border-border bg-background md:min-h-0">
				<Switch
					fallback={
						<div class="min-w-0 flex-1">
							<FieldsSkeleton />
						</div>
					}
				>
					<Match when={props.layout === "details"}>
						<div class="flex min-h-0 flex-1">
							<div class="min-w-0 flex-1">
								<FieldsSkeleton />
							</div>
							<div
								aria-hidden="true"
								class="flex w-82.5 shrink-0 flex-col gap-5 border-s border-border bg-card p-6"
							>
								<span class="skeleton block h-5 w-28" />
								<span class="skeleton block h-9 w-full" />
								<div class="flex flex-col gap-3 border-t border-border pt-5">
									<span class="skeleton block h-4 w-3/4" />
									<span class="skeleton block h-4 w-2/3" />
									<span class="skeleton block h-4 w-4/5" />
									<span class="skeleton block h-4 w-1/2" />
								</div>
								<div class="flex flex-col gap-3 border-t border-border pt-5">
									<span class="skeleton block h-5 w-24" />
									<span class="skeleton block h-16 w-full" />
								</div>
							</div>
						</div>
					</Match>
					<Match when={props.layout === "preview" && props}>
						{(preview) => (
							<div class="flex min-h-0 flex-1">
								<div
									class="shrink-0 overflow-hidden"
									style={{ width: `${preview().fieldsWidth}px` }}
								>
									<FieldsSkeleton />
								</div>
								<span aria-hidden="true" class="w-px shrink-0 bg-border" />
								<div aria-hidden="true" class="relative min-w-0 flex-1">
									<PreviewLoading />
								</div>
							</div>
						)}
					</Match>
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
		</Skeleton>
	);
};

export default DocumentEditorSkeleton;
