import type { LucidViteProject } from "@lucidcms/core/vite";

/** Declares required deployment secrets and optional secrets with local values for development or preview, since local Workers receive only declared secrets while deployed Workers receive undeclared secrets but require every declared value. */
const getWorkerSecrets = (
	project: Pick<LucidViteProject, "envVariables" | "rawEnv">,
	options: { deploy: boolean },
) =>
	project.envVariables
		.filter(
			({ name, required }) =>
				required || (!options.deploy && project.rawEnv?.[name] !== undefined),
		)
		.map(({ name }) => name);

export default getWorkerSecrets;
