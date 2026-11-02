import type { Component } from "solid-js";
import Skeleton from "@/components/Skeleton/Skeleton";

/** Sketches the editor header and body while a document, or the request it belongs to, loads. */
const DocumentEditorSkeleton: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<Skeleton class="flex grow flex-col">
			<div class="-mt-4 relative bg-background rounded-b-xl border border-border h-36">
				<span class="absolute inset-4 bg-background-hover z-5 skeleton" />
			</div>
			<div class="mt-2 bg-background rounded-t-xl border border-border grow overflow-hidden relative">
				<div class="absolute top-4 left-4 bottom-4 right-4 flex flex-col z-10">
					<span class="h-62 w-full skeleton block mb-4" />
					<span class="h-full w-full skeleton block" />
				</div>
			</div>
		</Skeleton>
	);
};

export default DocumentEditorSkeleton;
