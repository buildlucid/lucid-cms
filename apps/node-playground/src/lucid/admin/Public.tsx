import type { AdminRouteComponent } from "@lucidcms/admin/types";

const Public: AdminRouteComponent = () => {
	// ----------------------------------
	// Render
	return (
		<section class="min-h-screen grid place-content-center gap-4 p-8">
			<h1>Public playground</h1>
			<p>This route works both with and without a session.</p>
			<a class="text-primary-base underline" href="/lucid/e/playground">
				Open the admin playground
			</a>
		</section>
	);
};

export default Public;
