import type { AdminRouteComponent } from "@lucidcms/admin/types";
import { createSignal } from "solid-js";

const Diagnostics: AdminRouteComponent = () => {
	// ----------------------------------
	// State & Hooks
	const [count, setCount] = createSignal(0);

	// ----------------------------------
	// Render
	return (
		<section
			class="extension-panel m-6 max-w-3xl rounded-lg border border-border bg-card-base p-6 extension-wide:p-8"
			data-testid="admin-extension-route"
		>
			<h1 class="text-xl font-semibold text-title">
				Admin extension playground
			</h1>
			<p class="mt-2 text-body">
				Custom Solid route using Lucid’s theme, Tailwind utilities and a startup
				script.
			</p>
			<p class="mt-2 text-seo-good" data-testid="admin-custom-colour">
				This colour comes from the playground’s Tailwind theme.
			</p>
			<p class="mt-4 text-sm text-subtitle" data-testid="admin-script-status">
				Script: {document.documentElement.dataset.adminExample ?? "missing"}
			</p>
			<button
				class="mt-4 cursor-pointer rounded-md bg-primary-base px-4 py-2 text-primary-contrast hover:bg-primary-hover"
				type="button"
				onClick={() => setCount(count() + 1)}
			>
				Count: {count()}
			</button>
			<a
				class="ml-4 text-primary-base underline underline-offset-4 hover:text-primary-hover"
				href="/lucid/collections/page/latest/create"
			>
				Open page editor
			</a>
		</section>
	);
};

export default Diagnostics;
