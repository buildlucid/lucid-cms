import { ErrorBoundary, type ParentComponent, Suspense } from "solid-js";
import T from "@/translations";

/** Keeps a failed extension from removing the surrounding editor or admin layout. */
const AdminExtensionBoundary: ParentComponent<{ name: string }> = (props) => {
	// ----------------------------------
	// Render
	return (
		<ErrorBoundary
			fallback={() => (
				<p role="alert">
					{T()("admin.extension.failed", { name: props.name })}
				</p>
			)}
		>
			<Suspense fallback={<p role="status">{T()("common.loading")}</p>}>
				{props.children}
			</Suspense>
		</ErrorBoundary>
	);
};

export default AdminExtensionBoundary;
