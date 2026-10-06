import type { Collection, RequestDetail } from "@types";
import { type Component, createMemo, For, Show } from "solid-js";
import T from "@/translations";
import { getTargetLabel } from "@/utils/requests";

/**
 * A full-width bar under the page header that sticks to the top of the page
 * while a request is publishing. Lists each target with how many documents
 * are going to it. The request page refreshes once it finishes.
 */
export const RequestPublishing: Component<{
	request: RequestDetail;
	collections: Collection[];
	/** Queued while waiting to start, running once publication has begun. */
	status: "queued" | "running";
}> = (props) => {
	// ----------------------------------------
	// Memos
	const queued = createMemo(() => props.status === "queued");
	const targets = createMemo(() => {
		const summary = new Map<string, { label: string; count: number }>();
		for (const document of props.request.documents) {
			const collection = props.collections.find(
				(collection) => collection.key === document.collectionKey,
			);
			for (const { target } of document.targets) {
				const entry = summary.get(target) ?? {
					label: getTargetLabel(collection, target),
					count: 0,
				};
				entry.count += 1;
				summary.set(target, entry);
			}
		}
		return Array.from(summary.values());
	});

	// ----------------------------------------
	// Render
	return (
		<section
			role="status"
			aria-live="polite"
			class="sticky top-0 z-10 -mx-4 -mt-4 border-b border-border bg-card pb-3.5 md:-mx-6 md:-mt-6"
		>
			<div class="px-4 pt-3.5 md:px-6">
				<p class="text-sm font-medium text-title">
					{T()(
						queued()
							? "requests.publishing.queued.title"
							: "requests.publishing.title",
					)}
				</p>
				<p class="mt-0.5 text-sm text-body">
					{T()(
						queued()
							? "requests.publishing.queued.description"
							: "requests.publishing.description",
					)}
				</p>
			</div>
			<Show when={targets().length > 0}>
				{/* the edge fades match the padding, so pills only fade once scrolled under them */}
				<div class="relative mt-2.5">
					<ul class="hide-scrollbar flex gap-2 overflow-x-auto px-4 md:px-6">
						<For each={targets()}>
							{(target) => (
								<li class="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-background px-2.5 py-1 text-xs">
									<span class="font-medium text-title">{target.label}</span>
									<span aria-hidden="true" class="text-muted">
										·
									</span>
									<span class="text-body">
										{T()("requests.publishing.documents", {
											count: target.count,
										})}
									</span>
								</li>
							)}
						</For>
					</ul>
					<div
						aria-hidden="true"
						class="pointer-events-none absolute inset-y-0 left-0 w-4 bg-linear-to-r from-card to-transparent md:w-6"
					/>
					<div
						aria-hidden="true"
						class="pointer-events-none absolute inset-y-0 right-0 w-4 bg-linear-to-l from-card to-transparent md:w-6"
					/>
				</div>
			</Show>
			<Show when={!queued()}>
				<div
					aria-hidden="true"
					class="absolute inset-x-0 -bottom-px h-px overflow-hidden"
				>
					<div class="h-full w-1/3 bg-primary/60 animate-progress motion-reduce:hidden" />
				</div>
			</Show>
		</section>
	);
};
