import { describe, expect, test } from "vitest";
import type { UiIntegration } from "../../ui/types.js";
import resolveIntegrations from "./resolve-integrations.js";

const jsx = (name: string, include?: string[]): UiIntegration => ({
	name,
	extensions: [".jsx", ".tsx"],
	include,
	server: `@acme/site-${name}/server`,
	client: `@acme/site-${name}/client`,
});

describe("resolveIntegrations", () => {
	test("gives files in include to their integration and the rest to the one without", () => {
		const { match, list } = resolveIntegrations([
			jsx("react"),
			jsx("solid", ["components/solid/**"]),
		]);
		expect(match("components/solid/Toggle.tsx")?.name).toBe("solid");
		expect(match("components/Counter.tsx")?.name).toBe("react");
		expect(match("components/card.kiln")).toBeNull();
		expect(list[0]?.filter.exclude).toEqual(["components/solid/**"]);
	});

	test("fails when two integrations share an extension and neither has include", () => {
		expect(() => resolveIntegrations([jsx("react"), jsx("solid")])).toThrow(
			/The react and solid UI integrations both handle .jsx, .tsx files/,
		);
	});
});
