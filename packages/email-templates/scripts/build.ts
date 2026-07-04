import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mjml2html from "mjml";

type RenderedTemplate = {
	file: string;
	outputFile: string;
	html: string;
};

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(currentDir, "..");
const templatesDir = path.join(packageDir, "templates");
const coreTemplatesDir = path.resolve(packageDir, "../core/templates");
const checkMode = process.argv.includes("--check");

const readTemplateFiles = async () => {
	const entries = await readdir(templatesDir, { withFileTypes: true });

	return entries
		.filter((entry) => entry.isFile() && entry.name.endsWith(".mjml"))
		.map((entry) => entry.name)
		.toSorted();
};

const renderTemplate = async (file: string): Promise<RenderedTemplate> => {
	const inputPath = path.join(templatesDir, file);
	const mjml = await readFile(inputPath, "utf-8");
	const result = await mjml2html(mjml, {
		filePath: inputPath,
	});
	const errors = result.errors ?? [];

	if (errors.length > 0) {
		throw new Error(
			errors.map((error) => error.formattedMessage ?? error.message).join("\n"),
		);
	}

	return {
		file,
		outputFile: file.replace(/\.mjml$/, ".mustache"),
		html: result.html,
	};
};

const run = async () => {
	const renderedTemplates = await Promise.all(
		(await readTemplateFiles()).map(renderTemplate),
	);

	await mkdir(coreTemplatesDir, { recursive: true });

	const staleTemplates: string[] = [];
	for (const template of renderedTemplates) {
		const outputPath = path.join(coreTemplatesDir, template.outputFile);

		if (checkMode) {
			const currentHtml = await readFile(outputPath, "utf-8").catch(() => null);
			if (currentHtml !== template.html) {
				staleTemplates.push(template.outputFile);
			}
			continue;
		}

		await writeFile(outputPath, template.html);
	}

	if (staleTemplates.length > 0) {
		throw new Error(
			`Generated core email templates are stale: ${staleTemplates.join(", ")}`,
		);
	}
};

run().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
