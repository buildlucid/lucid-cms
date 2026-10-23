import { describe, expect, test } from "vitest";
import createDevErrorPage from "./create-dev-error-page.js";

const VITE_CLIENT = '<script type="module" src="/@vite/client">';

describe("createDevErrorPage", () => {
	test("loads Vite's client only during development", () => {
		const error = new Error("Failed");

		expect(
			createDevErrorPage({
				error,
				data: { kind: "dev", prefix: "site/", revision: "1" },
			}),
		).toContain(VITE_CLIENT);
		expect(createDevErrorPage({ error, data: null })).not.toContain(
			VITE_CLIENT,
		);
	});
});
