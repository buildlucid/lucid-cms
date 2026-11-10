import type { Component } from "solid-js";

/** Sketches the builder's fields column: the document's own fields, its fixed bricks, then the builder area. */
const FieldsSkeleton: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<div aria-hidden="true">
			<div class="flex flex-col gap-6 border-b border-border p-4 md:p-6">
				<div class="flex flex-col gap-2">
					<span class="skeleton block h-4 w-24" />
					<span class="skeleton block h-9 w-full" />
				</div>
				<div class="flex flex-col gap-2">
					<span class="skeleton block h-4 w-32" />
					<span class="skeleton block h-9 w-full" />
				</div>
				<div class="flex flex-col gap-2">
					<span class="skeleton block h-4 w-20" />
					<span class="skeleton block h-24 w-full" />
				</div>
			</div>
			<div class="flex items-center gap-2.5 border-b border-border px-4 py-4 md:px-6 md:py-5">
				<span class="skeleton block size-5" />
				<span class="skeleton block h-5 w-28" />
				<span class="skeleton ms-auto block size-5" />
			</div>
			<div class="flex items-center gap-2.5 border-b border-border px-4 py-4 md:px-6 md:py-5">
				<span class="skeleton block size-5" />
				<span class="skeleton block h-5 w-20" />
				<span class="skeleton ms-auto block size-5" />
			</div>
			<div class="p-6">
				<div class="mb-4 flex items-center justify-between gap-4">
					<div class="flex items-center gap-2.5">
						<span class="skeleton block size-5" />
						<span class="skeleton block h-5 w-24" />
					</div>
					<span class="skeleton block h-8 w-24" />
				</div>
				<div class="flex flex-col gap-2">
					<span class="skeleton block h-12 w-full" />
					<span class="skeleton block h-12 w-full" />
					<span class="skeleton block h-12 w-full" />
				</div>
			</div>
		</div>
	);
};

export default FieldsSkeleton;
