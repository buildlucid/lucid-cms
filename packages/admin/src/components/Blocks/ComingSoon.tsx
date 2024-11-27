import T from "@/translations";
import type { Component } from "solid-js";

const ComingSoon: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<div class="bg-container-2 p-15 rounded-md border border-border text-center min-h-96 flex flex-col items-center justify-center">
			<h2 class="mb-2">{T()("coming_soon_title")}</h2>
			<p>{T()("coming_soon_description")}</p>
		</div>
	);
};

export default ComingSoon;
