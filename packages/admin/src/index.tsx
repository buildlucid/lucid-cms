/* @refresh reload */
// @ts-expect-error
import "./index.css";
// @ts-expect-error
import "virtual:lucid-admin-assets";
import { render } from "solid-js/web";
// @ts-expect-error
import "@/store/themeStore/themeStore";
import App from "./App";

const root = document.getElementById("root");

// @ts-expect-error
if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
	);
}

if (root !== null) render(() => <App />, root);
