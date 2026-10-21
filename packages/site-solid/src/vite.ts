import { defineUiVite } from "@lucidcms/plugin-site/ui";
import solidPlugin from "vite-plugin-solid";

/** vite-plugin-solid, compiling components for hydration on the server and in the browser. */
export default defineUiVite((files) => [solidPlugin({ ssr: true, ...files })]);
