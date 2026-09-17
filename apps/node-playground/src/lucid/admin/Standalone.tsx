import type { AdminRouteComponent } from "@lucidcms/admin/types";

const Standalone: AdminRouteComponent = () => {
	// ----------------------------------
	// Render
	return (
		<section class="min-h-screen bg-card-base p-8">
			<h1>Standalone playground</h1>
			<p class="mt-4">
				This route requires a session and owns its full-page layout.
			</p>
			<a
				class="mt-6 inline-block text-primary-base underline"
				href="/lucid/e/playground"
			>
				Back to the admin playground
			</a>
		</section>
	);
};

export default Standalone;
