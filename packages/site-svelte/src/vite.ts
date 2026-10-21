import { defineUiVite } from "@lucidcms/plugin-site/ui";
import { svelte } from "@sveltejs/vite-plugin-svelte";

/** vite-plugin-svelte, which compiles components for the server and the browser. */
export default defineUiVite((files) => [svelte(files)]);
