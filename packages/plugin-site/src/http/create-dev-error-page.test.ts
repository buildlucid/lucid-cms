import { describe, expect, test } from "vitest";
import createDevErrorPage from "./create-dev-error-page.js";

const VITE_CLIENT = '<script type="module" src="/_assets/@vite/client">';

describe("createDevErrorPage", () => {
	test("loads Vite's client only while Vite's dev server runs", () => {
		const error = new Error("Failed");

		expect(
			createDevErrorPage({
				error,
				data: { kind: "dev", directory: "/site", vite: true },
			}),
		).toContain(VITE_CLIENT);
		expect(
			createDevErrorPage({
				error,
				data: { kind: "dev", directory: "/site", vite: false },
			}),
		).not.toContain(VITE_CLIENT);
	});
});
