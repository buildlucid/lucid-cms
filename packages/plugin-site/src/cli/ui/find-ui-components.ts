import { createKiln, memoryLoader } from "@lucidkiln/core";
import propTypes from "../../content/prop-types.js";
import type { ResolvedIntegrations } from "./resolve-integrations.js";

const RENDERS = new Set(["component", "include", "island"]);

/**
 * The UI components templates name, by resolved name, with the integration that renders each, sorted by name. Only
 * written-out names are found, so one built from data, such as `"components/" ~ type ~ ".tsx"`, isn't bundled.
 */
const findUiComponents = async (
	templates: Record<string, string>,
	integrations: ResolvedIntegrations,
) => {
	const kiln = createKiln({
		loader: memoryLoader(templates),
		types: propTypes,
	});
	const components = new Map<string, string>();
	for (const name of Object.keys(templates)) {
		const analysis = await kiln.analyze(name);
		for (const reference of analysis.templates) {
			if (reference.name === null || !RENDERS.has(reference.kind)) continue;
			const integration = integrations.match(reference.name);
			if (integration) components.set(reference.name, integration.name);
		}
	}
	return new Map(
		[...components].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
	);
};

export default findUiComponents;
