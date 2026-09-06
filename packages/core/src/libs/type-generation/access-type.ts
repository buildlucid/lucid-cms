import type { AccessGroup } from "../permission/access-config.js";
import type { TypeGenerationContribution } from "./types.js";

/** Generates permission and scope keys from the project's resolved access groups. */
const generateAccessTypes = (
	groups: AccessGroup[],
): TypeGenerationContribution => {
	const registries = {
		CustomPermissions: groups.flatMap((group) =>
			Object.keys(group.permissions ?? {}),
		),
		CustomExternalScopes: groups.flatMap((group) =>
			Object.keys(group.scopes ?? {}),
		),
	};
	const declarations = Object.entries(registries).map(
		([name, keys]) =>
			`interface ${name} {\n${Array.from(new Set(keys))
				.sort()
				.map((key) => `\t\t${JSON.stringify(key)}: true;`)
				.join("\n")}\n\t}`,
	);
	return {
		moduleAugmentations: [
			{ module: "@lucidcms/core/types", declarations },
			{ module: "@lucidcms/types", declarations },
		],
	};
};

export default generateAccessTypes;
