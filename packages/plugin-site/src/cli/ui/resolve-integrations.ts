import path from "node:path";
import { LucidError } from "@lucidcms/core";
import { PLUGIN_KEY } from "../../constants.js";
import type { UiFilter, UiIntegration } from "../../ui/types.js";

/** An integration with the files it owns worked out from every integration sharing its extensions. */
export type ResolvedIntegration = UiIntegration & { filter: UiFilter };

export type ResolvedIntegrations = {
	list: ResolvedIntegration[];
	/** Renderer packages Vite bundles with components so both share one copy of their library. */
	packages: string[];
	/** The integration that renders a resolved template name, or null when the name is a template. */
	match: (name: string) => ResolvedIntegration | null;
};

/** The package a bare module name such as `@lucidcms/site-react/server` belongs to, or null for a path. */
const packageOf = (specifier: string) => {
	if (/^(\.|\/|[a-z]+:)/i.test(specifier)) return null;
	const parts = specifier.split("/");
	return (
		specifier.startsWith("@") ? parts.slice(0, 2) : parts.slice(0, 1)
	).join("/");
};

const matches = (name: string, globs: string[] | undefined) =>
	globs?.some((glob) => path.posix.matchesGlob(name, glob)) ?? false;

/** Assigns files to integrations, requiring `include` for shared extensions such as React and Solid's `.tsx`, except for one integration that owns the remainder. */
const resolveIntegrations = (
	integrations: UiIntegration[],
): ResolvedIntegrations => {
	const list = integrations.map((integration) => {
		const sharing = integrations.filter(
			(other) =>
				other !== integration &&
				other.extensions.some((extension) =>
					integration.extensions.includes(extension),
				),
		);
		if (!integration.include) {
			const rival = sharing.find((other) => !other.include);
			if (rival) {
				throw new LucidError({
					scope: PLUGIN_KEY,
					message: `The ${integration.name} and ${rival.name} UI integrations both handle ${integration.extensions.join(", ")} files. Give one of them include, such as ${rival.name}({ include: ["components/${rival.name}/**"] }).`,
				});
			}
		}
		// The integration that owns the rest leaves the others' files to them.
		const exclude = [
			...(integration.exclude ?? []),
			...(integration.include
				? []
				: sharing.flatMap((other) => other.include ?? [])),
		];
		return {
			...integration,
			filter: {
				include: integration.include,
				exclude: exclude.length > 0 ? exclude : undefined,
			},
		};
	});

	return {
		list,
		packages: [
			...new Set(list.flatMap(({ server }) => packageOf(server) ?? [])),
		],
		match: (name) =>
			list.find(
				({ extensions, filter }) =>
					extensions.includes(path.posix.extname(name)) &&
					(!filter.include || matches(name, filter.include)) &&
					!matches(name, filter.exclude),
			) ?? null,
	};
};

export default resolveIntegrations;
