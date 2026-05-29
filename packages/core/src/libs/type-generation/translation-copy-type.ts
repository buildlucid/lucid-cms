import { readdir } from "node:fs/promises";
import path from "node:path";
import constants from "../../constants/constants.js";
import type { TypeGenerationContribution } from "./types.js";

const translationFilePattern = /^(.+)\.(admin|server)\.json$/;

type TranslationTypeSource = {
	identifier: string;
	scope: "admin" | "server";
	importPath: string;
};

const toImportPath = (fromDir: string, filePath: string) => {
	const relativePath = path
		.relative(fromDir, filePath)
		.split(path.sep)
		.join("/");
	return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
};

const renderCopyKeyType = (
	typeName: string,
	prefix: "admin" | "server",
	identifiers: string[],
) => {
	if (identifiers.length === 0) return `type ${typeName} = never;`;

	const values = identifiers
		.map(
			(identifier) =>
				`\t| \`${prefix}:\${Extract<keyof typeof ${identifier}, string>}\``,
		)
		.join("\n");

	return `type ${typeName} =\n${values};`;
};

const renderCopyKeyRegistry = (sources: TranslationTypeSource[]) => {
	const adminIdentifiers = sources
		.filter((source) => source.scope === "admin")
		.map((source) => source.identifier);
	const serverIdentifiers = sources
		.filter((source) => source.scope === "server")
		.map((source) => source.identifier);

	return `${renderCopyKeyType("GeneratedAdminCopyKey", "admin", adminIdentifiers)}

${renderCopyKeyType("GeneratedServerCopyKey", "server", serverIdentifiers)}

type GeneratedCopyTranslationKey = GeneratedAdminCopyKey | GeneratedServerCopyKey;

declare global {
\tnamespace LucidCMS {
\t\tinterface CopyTranslationKeys extends Record<GeneratedCopyTranslationKey, true> {}
\t}
}`;
};

/**
 * Generates project-local copy key hints from `translations/*.admin.json` and
 * `translations/*.server.json`. Core and plugin keys are intentionally ignored
 * so autocomplete reflects copy owned by the current project.
 */
const generateTranslationCopyTypes = async (props: {
	projectRoot?: string;
}): Promise<TypeGenerationContribution | undefined> => {
	const projectRoot = props.projectRoot ?? process.cwd();
	const translationsDir = path.join(projectRoot, "translations");
	const generatedTypesDir = path.join(projectRoot, constants.directories.lucid);

	let files: string[];
	try {
		files = await readdir(translationsDir);
	} catch {
		return undefined;
	}

	const sources = files
		.sort()
		.flatMap((file, index): TranslationTypeSource[] => {
			const match = file.match(translationFilePattern);
			if (!match) return [];

			const [, _locale, scope] = match;
			if (scope !== "admin" && scope !== "server") return [];

			return [
				{
					identifier: `translationSource${index}`,
					scope,
					importPath: toImportPath(
						generatedTypesDir,
						path.join(translationsDir, file),
					),
				},
			];
		});

	if (sources.length === 0) return undefined;

	return {
		imports: sources.map(
			(source) =>
				`import type ${source.identifier} from "${source.importPath}";`,
		),
		declarations: [renderCopyKeyRegistry(sources)],
		moduleAugmentations: [],
	};
};

export default generateTranslationCopyTypes;
