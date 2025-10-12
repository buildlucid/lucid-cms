import { createResource, Suspense } from "solid-js";

/**
 * Proof of concept for runtime plugin loading.
 * This demonstrates that we can dynamically import and render
 * SolidJS components at runtime for future plugin support.
 */
function PluginTest() {
	const [PluginComponent] = createResource(async () => {
		const module = await import(
			/* @vite-ignore */
			`${window.location.origin}/admin/plugins/test-component.js`
		);
		return module.default;
	});

	return (
		<div style={{ padding: "20px" }}>
			<h2>Dynamic Component Loading Test</h2>
			<p>
				This route demonstrates runtime plugin loading for future component
				plugin support.
			</p>

			<Suspense fallback={<div>Loading plugin...</div>}>
				{(() => {
					const Component = PluginComponent();
					if (!Component) return <div>Failed to load plugin</div>;
					return <Component message="Props work correctly!" />;
				})()}
			</Suspense>
		</div>
	);
}

export default PluginTest;
