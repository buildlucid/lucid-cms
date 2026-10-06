import { type Component, For } from "solid-js";
import PageLayout from "@/components/PageLayout/PageLayout";

export const RequestPageSkeleton: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<div aria-busy="true" class="flex grow flex-col">
			<div class="rounded-t-xl border-b border-border bg-background">
				<div class="flex flex-col items-start gap-x-8 gap-y-4 px-4 pt-4 pb-4 md:flex-row md:justify-between md:px-6 md:pt-6 md:pb-6">
					<div class="w-full min-w-0 md:grow">
						<span class="skeleton block h-5 w-64 max-w-full" />
						<span class="skeleton mt-2 block h-4 w-96 max-w-full" />
					</div>
					<div class="flex w-full items-center justify-end gap-2.5 md:w-auto md:shrink-0">
						<span class="skeleton block h-9 w-24" />
						<span class="skeleton block h-9 w-28" />
					</div>
				</div>
			</div>
			<PageLayout.Body>
				<div class="flex w-full grow flex-col lg:flex-row">
					<div class="flex min-w-0 grow flex-col gap-10 px-4 pt-4 md:px-6 md:pt-6">
						<span class="skeleton block h-20 w-full" />
						<section>
							<span class="skeleton mb-4 block h-5 w-36" />
							<span class="skeleton block h-44 w-full" />
						</section>
						<section>
							<span class="skeleton mb-4 block h-5 w-28" />
							<div class="grid gap-4">
								<For each={[0, 1]}>
									{() => <span class="skeleton block h-40 w-full" />}
								</For>
							</div>
						</section>
					</div>
					<aside class="w-full shrink-0 border-t border-border p-4 md:p-6 lg:w-82.5 lg:border-t-0 lg:border-s">
						<div class="grid gap-6">
							<For each={[0, 1, 2]}>
								{() => (
									<div>
										<span class="skeleton mb-3 block h-4 w-24" />
										<span class="skeleton block h-16 w-full" />
									</div>
								)}
							</For>
						</div>
					</aside>
				</div>
			</PageLayout.Body>
		</div>
	);
};
