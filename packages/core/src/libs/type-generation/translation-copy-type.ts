import { readdir } from "node:fs/promises";
import path from "node:path";
import constants from "../../constants/constants.js";
import type { ResourceFile } from "../resources/types.js";
import type { TypeGenerationContribution } from "./types.js";

type TranslationTypeSource = {
	identifier: string;
	scope: string;
	importPath: string;
};

const toImportPath = (fromDir: string, filePath: string) => {
	const relativePath = path
		.relative(fromDir, filePath)
		.split(path.sep)
		.join("/");
	return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
};

const renderTranslationKeyRegistry = (sources: TranslationTypeSource[]) => {
	const values = sources
		.map(
			(source) =>
				`\t| \`${source.scope}:\${Extract<keyof typeof ${source.identifier}, string>}\``,
		)
		.join("\n");

	return `type GeneratedTranslationKey =
${values};

declare global {
\tnamespace LucidCMS {
\t\tinterface TranslationKeys extends Record<GeneratedTranslationKey, true> {}
\t}
}`;
};

/** Generates `scope:key` types from the runtime's project and plugin files, defaulting to the project's translations directory when direct callers omit files. */
const generateTranslationCopyTypes = async (props: {
	projectRoot?: string;
	files?: ResourceFile[];
}): Promise<TypeGenerationContribution | undefined> => {
	const projectRoot = props.projectRoot ?? process.cwd();
	const translationsDir = path.join(projectRoot, "translations");
	const generatedTypesDir = path.join(projectRoot, constants.directories.lucid);

	let files = props.files;
	if (files === undefined) {
		try {
			files = (await readdir(translationsDir)).map((name) => ({
				name,
				path: path.join(translationsDir, name),
			}));
		} catch {
			return undefined;
		}
	}

	const sources = [...new Map(files.map((file) => [file.path, file])).values()]
		.sort((a, b) => a.path.localeCompare(b.path))
		.flatMap((file, index): TranslationTypeSource[] => {
			const scope = path
				.basename(file.name)
				.match(constants.i18n.fileName)?.[2];
			if (!scope) return [];
			return [
				{
					identifier: `translationSource${index}`,
					scope,
					importPath: toImportPath(generatedTypesDir, file.path),
				},
			];
		});

	if (sources.length === 0) return undefined;

	return {
		imports: sources.map(
			(source) =>
				`import type ${source.identifier} from "${source.importPath}";`,
		),
		declarations: [renderTranslationKeyRegistry(sources)],
		moduleAugmentations: [],
	};
};

export default generateTranslationCopyTypes;
