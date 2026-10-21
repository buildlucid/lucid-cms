import { defineUiVite } from "@lucidcms/plugin-site/ui";
import reactPlugin from "@vitejs/plugin-react";

const PACKAGES = ["react", "react-dom"];

/** plugin-react, with Fast Refresh in development, and one copy of React for every component. */
export default defineUiVite((files) => [
	// Only JSX files: plugin-react's own default takes in the TypeScript of Vue and Svelte components too.
	reactPlugin({
		include: files.include ?? /\.[jt]sx$/,
		exclude: files.exclude,
	}),
	{
		name: "lucid:react",
		config: () => ({
			// Even from linked packages.
			resolve: { dedupe: PACKAGES },
			// Only the generated hydration modules import it, which Vite finds late. Optimising it then rebuilds
			// react-dom, while the browser keeps the copy it already has, so it is optimised up front with react-dom.
			optimizeDeps: { include: ["react-dom/client"] },
		}),
	},
]);
