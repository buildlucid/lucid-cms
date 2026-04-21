import { writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { ZodType } from "zod";
import constants from "../../constants/constants.js";
import type { Config } from "../../types/config.js";
import { ensureLucidDirectoryExists } from "../../utils/helpers/lucid-directory.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import generateCollectionClientTypes from "../collection/type-gen/index.js";
import logger from "../logger/index.js";
import generateAdapterOptionsTypes from "./adapter-options-type.js";
import generateDatabaseOptionsTypes from "./database-options-type.js";
import generateEnvTypes from "./env-type.js";
import type {
	TypeGenerationContribution,
	TypeGenerationFile,
	TypeGenerationModule,
	TypeGenerationModuleAugmentation,
} from "./types.js";

const renderModuleAugmentation = (
	augmentation: TypeGenerationModuleAugmentation,
): string => {
	const declarations = augmentation.declarations
		.map((declaration) => `\t${declaration}`)
		.join("\n");

	return `declare module '${augmentation.module}' {\n${declarations}\n}`;
};

const renderTypeGenerationFile = (file: TypeGenerationFile): string => {
	const sections = [constants.typeGeneration.disclaimer];

	for (const reference of file.references ?? []) {
		sections.push(`/// <reference path="${reference}" />`);
	}

	for (const imported of file.imports ?? []) {
		sections.push(imported);
	}

	for (const declaration of file.declarations ?? []) {
		sections.push(declaration);
	}

	for (const augmentation of file.moduleAugmentations ?? []) {
		sections.push(renderModuleAugmentation(augmentation));
	}

	if (
		file.exportStub ||
		((file.moduleAugmentations?.length ?? 0) > 0 &&
			(file.imports?.length ?? 0) === 0)
	) {
		sections.push("export {};");
	}

	return `${sections.filter(Boolean).join("\n\n")}\n`;
};

const mergeModuleAugmentations = (
	contributions: TypeGenerationContribution[],
): TypeGenerationModuleAugmentation[] => {
	const augmentations = new Map<TypeGenerationModule, string[]>();

	for (const contribution of contributions) {
		for (const augmentation of contribution.moduleAugmentations) {
			const current = augmentations.get(augmentation.module) ?? [];
			augmentations.set(augmentation.module, [
				...current,
				...augmentation.declarations,
			]);
		}
	}

	return Array.from(augmentations.entries()).map(([module, declarations]) => ({
		module,
		declarations: Array.from(new Set(declarations)),
	}));
};

const buildCoreTypesFile = (props: {
	contributions: TypeGenerationContribution[];
}): TypeGenerationFile => {
	const imports = props.contributions.flatMap(
		(contribution) => contribution.imports ?? [],
	);

	return {
		filename: constants.typeGeneration.files.core,
		references: [`./${constants.typeGeneration.files.client}`],
		imports: Array.from(new Set(imports)),
		moduleAugmentations: mergeModuleAugmentations(props.contributions),
	};
};

const generateTypes = async (props: {
	envSchema?: ZodType;
	configPath: string;
	adapterModule?: string;
	databaseModule?: string;
	collections: CollectionBuilder[];
	localization: Config["localization"];
}) => {
	const lucidDir = await ensureLucidDirectoryExists();
	const configRelativePath = relative(lucidDir, props.configPath);

	const contributions = (
		await Promise.all([
			generateEnvTypes({
				schema: props.envSchema,
				configRelativePath,
			}),
			generateAdapterOptionsTypes({
				adapterModule: props.adapterModule,
			}),
			generateDatabaseOptionsTypes({
				databaseModule: props.databaseModule,
			}),
		])
	).filter((result): result is TypeGenerationContribution => Boolean(result));

	const files: TypeGenerationFile[] = [
		buildCoreTypesFile({
			contributions,
		}),
		generateCollectionClientTypes({
			collections: props.collections,
			localization: props.localization,
		}),
	];

	await Promise.all(
		files.map(async (file) => {
			const filePath = join(lucidDir, file.filename);

			await writeFile(filePath, renderTypeGenerationFile(file));

			logger.debug({
				message: `Generated ${filePath}`,
				scope: constants.logScopes.typeGeneration,
			});
		}),
	);
};

export default generateTypes;
