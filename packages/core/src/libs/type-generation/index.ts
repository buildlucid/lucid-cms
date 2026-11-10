import { mkdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import type { ZodType } from "zod";
import constants from "../../constants/constants.js";
import type { ResolvedLucidConfig } from "../../types/config.js";
import { ensureLucidDirectoryExists } from "../../utils/helpers/lucid-directory.js";
import writeFileIfChanged from "../../utils/helpers/write-file-if-changed.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import generateCollectionTypes from "../collection/type-gen/index.js";
import type { RenderedTemplates } from "../email/types.js";
import logger from "../logger/index.js";
import type { ResourceFile } from "../resources/types.js";
import generateAccessTypes from "./access-type.js";
import generateEmailTemplateTypes from "./email-template-type.js";
import generateEnvTypes from "./env-type.js";
import generateTranslationCopyTypes from "./translation-copy-type.js";
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
	const declarations = props.contributions.flatMap(
		(contribution) => contribution.declarations ?? [],
	);

	return {
		filename: constants.typeGeneration.files.core,
		references: [
			`./${constants.typeGeneration.files.client}`,
			`./${constants.typeGeneration.files.writes}`,
		],
		imports: Array.from(new Set(imports)),
		declarations: Array.from(new Set(declarations)),
		moduleAugmentations: mergeModuleAugmentations(props.contributions),
	};
};

const generateTypes = async (props: {
	envSchema?: ZodType;
	configPath: string;
	projectRoot?: string;
	translationFiles?: ResourceFile[];
	emailTemplates?: RenderedTemplates;
	collections: CollectionBuilder[];
	access: ResolvedLucidConfig["access"];
	localization: ResolvedLucidConfig["localization"];
	/** Extra files, relative to the config, to write the collection types to for front ends that install `@lucidcms/client`. */
	clientTypes?: string[];
}) => {
	const lucidDir = await ensureLucidDirectoryExists();
	const configRelativePath = relative(lucidDir, props.configPath);

	const contributions = (
		await Promise.all([
			generateAccessTypes(props.access),
			generateEnvTypes({
				schema: props.envSchema,
				configRelativePath,
			}),
			generateTranslationCopyTypes({
				projectRoot: props.projectRoot,
				files: props.translationFiles,
			}),
			generateEmailTemplateTypes(props.emailTemplates ?? {}),
		])
	).filter((result): result is TypeGenerationContribution => Boolean(result));

	const collectionTypes = generateCollectionTypes({
		collections: props.collections,
		localization: props.localization,
	});
	const files: TypeGenerationFile[] = [
		buildCoreTypesFile({
			contributions,
		}),
		collectionTypes.client,
		collectionTypes.writes,
		...contributions.flatMap((contribution) => contribution.files ?? []),
	];

	if (props.clientTypes?.length) {
		const clientFile = renderTypeGenerationFile(
			generateCollectionTypes({
				collections: props.collections,
				localization: props.localization,
				module: constants.typeGeneration.modules.clientTypes,
			}).client,
		);
		await Promise.all(
			props.clientTypes.map(async (path) => {
				const filePath = resolve(dirname(props.configPath), path);
				await mkdir(dirname(filePath), { recursive: true });
				await writeFileIfChanged(filePath, clientFile);
			}),
		);
	}

	await Promise.all(
		files.map(async (file) => {
			const filePath = join(lucidDir, file.filename);

			await writeFileIfChanged(filePath, renderTypeGenerationFile(file));

			logger.debug({
				message: `Generated ${filePath}`,
				scope: constants.logScopes.typeGeneration,
			});
		}),
	);
};

export default generateTypes;
