import { EmptyState, Link } from "@lucidcms/admin/components";
import type { RouteComponent } from "@lucidcms/admin/types";

/** Routes with `shell: "none"` own the whole page, so they bring their own layout. */
const Standalone: RouteComponent = () => {
	// ----------------------------------
	// Render
	return (
		<main class="grid min-h-screen place-content-center bg-background-base p-8">
			<EmptyState
				title="Standalone playground"
				description="This route requires a session and owns its full-page layout, so it renders without the admin sidebar or header."
				actions={
					<Link href="/lucid/e/playground" size="sm">
						Back to the admin playground
					</Link>
				}
			/>
		</main>
	);
};

export default Standalone;
