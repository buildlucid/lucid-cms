import { generateTypes } from "@lucidkiln/core";
import constants from "../../constants/constants.js";
import createEmailKiln from "../email/templates/create-email-kiln.js";
import type { RenderedTemplates } from "../email/types.js";
import type { TypeGenerationContribution } from "./types.js";

const internalTemplates = new Set<string>(
	Object.values(constants.email.templates)
		.filter((template) => !template.external)
		.map((template) => template.key),
);

/** Generates a separate Kiln schema and `EmailTemplates` registry from sendable templates' `props`, keeping internal templates available only for includes and inheritance. */
const generateEmailTemplateTypes = async (
	templates: RenderedTemplates,
): Promise<TypeGenerationContribution | undefined> => {
	const names = Object.keys(templates)
		.filter((name) => !internalTemplates.has(name))
		.toSorted();
	if (names.length === 0) return undefined;

	const kiln = createEmailKiln(
		Object.fromEntries(
			Object.entries(templates).map(([name, template]) => [
				name,
				template.html,
			]),
		),
	);
	// Import Kiln's `string | Markup` through core's `KilnMarkup` export to avoid a direct project dependency, with `EmailTemplateInput` excluding markup storage cannot preserve.
	const schema = (await generateTypes(kiln, names)).replace(
		'import type { Markup } from "@lucidkiln/core";',
		`import type { KilnMarkup as Markup } from "${constants.typeGeneration.modules.coreTypes}";`,
	);
	const schemaFile = constants.typeGeneration.files.emails;

	return {
		files: [{ filename: schemaFile, declarations: [schema] }],
		imports: [
			`import type { Schema as EmailSchema } from "./${schemaFile.replace(/\.d\.ts$/, ".js")}";`,
		],
		moduleAugmentations: [
			{
				module: constants.typeGeneration.modules.coreTypes,
				declarations: [
					`interface EmailTemplates {\n${names
						.map(
							(name) =>
								`\t\t${JSON.stringify(name)}: EmailSchema["templates"][${JSON.stringify(name)}]["context"];`,
						)
						.join("\n")}\n\t}`,
				],
			},
		],
	};
};

export default generateEmailTemplateTypes;
