import { EmptyState, Link, Pill } from "@lucidcms/admin/components";
import { useSession } from "@lucidcms/admin/hooks";
import type { RouteComponent } from "@lucidcms/admin/types";

/** Public routes render with or without a session, so avoid permission-gated data. */
const PublicRoute: RouteComponent = () => {
	// ----------------------------------
	// State & Hooks
	const session = useSession();

	// ----------------------------------
	// Render
	return (
		<main class="flex min-h-screen flex-col items-center justify-center bg-background p-8">
			<Pill variant="outline" data-testid="public-session-status">
				Session: {session.status()}
			</Pill>
			<EmptyState
				title="Public playground"
				description="This route works both with and without a session."
				actions={
					<Link href="/lucid/e/playground" size="sm">
						Open the admin playground
					</Link>
				}
			/>
		</main>
	);
};

export default PublicRoute;
