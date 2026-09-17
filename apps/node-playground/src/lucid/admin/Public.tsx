import { useSession } from "@lucidcms/admin/hooks";
import type { RouteComponent } from "@lucidcms/admin/types";

const Public: RouteComponent = () => {
	// ----------------------------------
	// State & Hooks
	const session = useSession();

	// ----------------------------------
	// Render
	return (
		<section class="min-h-screen grid place-content-center gap-4 p-8">
			<h1>Public playground</h1>
			<p>This route works both with and without a session.</p>
			<p data-testid="public-session-status">Session: {session.status()}</p>
			<a class="text-primary-base underline" href="/lucid/e/playground">
				Open the admin playground
			</a>
		</section>
	);
};

export default Public;
