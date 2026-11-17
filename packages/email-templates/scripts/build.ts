import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createKiln, generateTypes, memoryLoader } from "@lucidkiln/core";
import mjml2html from "mjml";

type RenderedTemplate = {
	name: string;
	html: string;
};

type Output = {
	path: string;
	content: string;
};

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(currentDir, "..");
const templatesDir = path.join(packageDir, "templates");
const coreDir = path.resolve(packageDir, "../core");
const coreTemplatesDir = path.join(coreDir, "templates");
const coreSchemaPath = path.join(
	coreDir,
	"src/libs/email/templates/built-in-schema.ts",
);
const propsTag = /^\{%\s*props\b[\s\S]*?%\}\n/;
const repoDir = path.resolve(packageDir, "../..");
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
	const source = await readFile(inputPath, "utf-8");
	// Kiln needs `props` before any output, so it moves from the top of the MJML to the top of the compiled HTML.
	const props = source.match(propsTag)?.[0] ?? "";
	const result = await mjml2html(source.slice(props.length), {
		filePath: inputPath,
	});
	const errors = result.errors ?? [];

	if (errors.length > 0) {
		throw new Error(
			errors.map((error) => error.formattedMessage ?? error.message).join("\n"),
		);
	}

	return {
		name: file.replace(/\.mjml$/, ""),
		html: `${props}${result.html}`,
	};
};

/** Where each template is written, by name, from `outputs.json`. Templates it doesn't list go to core. */
const readOutputDirs = async (): Promise<Record<string, string>> => {
	const { $comment: _, ...dirs }: Record<string, string> = JSON.parse(
		await readFile(path.join(packageDir, "outputs.json"), "utf-8"),
	);
	return Object.fromEntries(
		Object.entries(dirs).map(([name, dir]) => [
			name,
			path.resolve(packageDir, dir),
		]),
	);
};

const run = async () => {
	const outputDirs = await readOutputDirs();
	const renderedTemplates = await Promise.all(
		(await readTemplateFiles()).map(renderTemplate),
	);
	//* core's types only describe the templates core ships
	const coreTemplates = renderedTemplates.filter(
		(template) => outputDirs[template.name] === undefined,
	);
	const kiln = createKiln({
		loader: memoryLoader(
			Object.fromEntries(
				coreTemplates.map((template) => [template.name, template.html]),
			),
		),
	});

	const outputs: Output[] = [
		...renderedTemplates.map((template) => ({
			path: path.join(
				outputDirs[template.name] ?? coreTemplatesDir,
				`${template.name}.kiln`,
			),
			content: template.html,
		})),
		{
			path: coreSchemaPath,
			content: await generateTypes(
				kiln,
				coreTemplates.map((template) => template.name),
			),
		},
	];

	await Promise.all(
		[coreTemplatesDir, ...Object.values(outputDirs)].map((dir) =>
			mkdir(dir, { recursive: true }),
		),
	);

	const staleOutputs: string[] = [];
	for (const output of outputs) {
		if (checkMode) {
			const current = await readFile(output.path, "utf-8").catch(() => null);
			if (current !== output.content) {
				staleOutputs.push(path.relative(repoDir, output.path));
			}
			continue;
		}

		await writeFile(output.path, output.content);
	}

	if (staleOutputs.length > 0) {
		throw new Error(
			`Generated email templates are stale: ${staleOutputs.join(", ")}. Run the email-templates build.`,
		);
	}
};

run().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
