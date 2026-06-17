import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { LucidError } from "../../utils/errors/index.js";
import {
	type ConfigArtifactKey,
	configArtifactEntries,
	type PreparedConfigArtifacts,
} from "./config-artifacts.js";

const runtimeSafeImportPaths = new Map([
	["@lucidcms/node-adapter", "@lucidcms/node-adapter/runtime"],
	["@lucidcms/cloudflare-adapter", "@lucidcms/cloudflare-adapter/runtime"],
]);

const artifactProperties = {
	config: "config",
	db: "db",
	runtime: "runtime",
} as const;

/**
 * Picks the TypeScript parser mode that matches the config file extension.
 */
const getScriptKind = (configPath: string) => {
	if (configPath.endsWith(".tsx")) return ts.ScriptKind.TSX;
	if (configPath.endsWith(".jsx")) return ts.ScriptKind.JSX;
	if (configPath.endsWith(".js") || configPath.endsWith(".mjs")) {
		return ts.ScriptKind.JS;
	}
	return ts.ScriptKind.TS;
};

/**
 * Adds every local name declared by a binding pattern to the supplied set.
 */
const collectBindingNames = (
	name: ts.BindingName,
	names: Set<string>,
): void => {
	if (ts.isIdentifier(name)) {
		names.add(name.text);
		return;
	}

	for (const element of name.elements) {
		if (ts.isOmittedExpression(element)) continue;
		collectBindingNames(element.name, names);
	}
};

/**
 * Collects names declared inside a node so later passes can ignore local declarations.
 */
const collectDeclaredNames = (node: ts.Node): Set<string> => {
	const names = new Set<string>();

	const visit = (child: ts.Node) => {
		if (
			(ts.isFunctionDeclaration(child) ||
				ts.isClassDeclaration(child) ||
				ts.isInterfaceDeclaration(child) ||
				ts.isTypeAliasDeclaration(child) ||
				ts.isEnumDeclaration(child)) &&
			child.name
		) {
			names.add(child.name.text);
		}

		if (ts.isVariableDeclaration(child)) {
			collectBindingNames(child.name, names);
		}

		if (ts.isParameter(child)) {
			collectBindingNames(child.name, names);
		}

		ts.forEachChild(child, visit);
	};

	visit(node);
	return names;
};

/**
 * Detects identifiers that introduce a declaration instead of reading a value.
 */
const isDeclarationIdentifier = (node: ts.Identifier): boolean => {
	const parent = node.parent;

	return (
		(ts.isVariableDeclaration(parent) && parent.name === node) ||
		(ts.isFunctionDeclaration(parent) && parent.name === node) ||
		(ts.isClassDeclaration(parent) && parent.name === node) ||
		(ts.isInterfaceDeclaration(parent) && parent.name === node) ||
		(ts.isTypeAliasDeclaration(parent) && parent.name === node) ||
		(ts.isEnumDeclaration(parent) && parent.name === node) ||
		(ts.isParameter(parent) && parent.name === node) ||
		(ts.isImportSpecifier(parent) && parent.name === node) ||
		(ts.isImportClause(parent) && parent.name === node) ||
		(ts.isNamespaceImport(parent) && parent.name === node)
	);
};

/**
 * Detects property names where the identifier is syntax, not a referenced value.
 */
const isPropertyNameIdentifier = (node: ts.Identifier): boolean => {
	const parent = node.parent;

	if (ts.isShorthandPropertyAssignment(parent)) {
		return false;
	}

	return (
		(ts.isPropertyAccessExpression(parent) && parent.name === node) ||
		(ts.isPropertyAssignment(parent) && parent.name === node) ||
		(ts.isMethodDeclaration(parent) && parent.name === node) ||
		(ts.isPropertyDeclaration(parent) && parent.name === node) ||
		(ts.isPropertySignature(parent) && parent.name === node) ||
		(ts.isMethodSignature(parent) && parent.name === node) ||
		(ts.isGetAccessorDeclaration(parent) && parent.name === node) ||
		(ts.isSetAccessorDeclaration(parent) && parent.name === node) ||
		(ts.isQualifiedName(parent) && parent.right === node)
	);
};

/**
 * Finds external identifiers read by a node after filtering local declarations.
 */
const collectReferencedIdentifiers = (node: ts.Node): Set<string> => {
	const referenced = new Set<string>();
	const declared = collectDeclaredNames(node);

	const visit = (child: ts.Node) => {
		if (
			ts.isIdentifier(child) &&
			!declared.has(child.text) &&
			!isDeclarationIdentifier(child) &&
			!isPropertyNameIdentifier(child)
		) {
			referenced.add(child.text);
		}

		ts.forEachChild(child, visit);
	};

	visit(node);
	return referenced;
};

const getStatementText = (sourceFile: ts.SourceFile, statement: ts.Statement) =>
	statement.getFullText(sourceFile).trim();

const stripExportModifier = (statementText: string) =>
	statementText
		.replace(/^export\s+declare\s+/, "declare ")
		.replace(/^export\s+/, "");

/**
 * Finds the object passed to `export default configureLucid(...)`.
 */
const findDefaultConfigureCall = (sourceFile: ts.SourceFile) => {
	for (const statement of sourceFile.statements) {
		if (!ts.isExportAssignment(statement)) continue;
		if (!ts.isCallExpression(statement.expression)) continue;

		const [definition] = statement.expression.arguments;
		if (definition && ts.isObjectLiteralExpression(definition)) {
			return definition;
		}
	}

	throw new LucidError({
		message:
			"Lucid config artifact splitting requires `export default configureLucid({ runtime, db, config })`.",
	});
};

/**
 * Reads an object property name when the splitter supports it.
 */
const getPropertyName = (name: ts.PropertyName): string | undefined => {
	if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
		return name.text;
	}
};

/**
 * Gets a top-level config artifact expression, including shorthand properties.
 */
const getObjectPropertyExpression = (
	object: ts.ObjectLiteralExpression,
	propertyName: string,
): ts.Expression => {
	for (const property of object.properties) {
		if (
			ts.isShorthandPropertyAssignment(property) &&
			property.name.text === propertyName
		) {
			return property.name;
		}

		if (
			ts.isPropertyAssignment(property) &&
			getPropertyName(property.name) === propertyName
		) {
			return property.initializer;
		}
	}

	throw new LucidError({
		message: `Lucid config is missing the top-level \`${propertyName}\` property.`,
	});
};

/**
 * Returns the exported `env` schema expression when the project defines one.
 */
const getExportedEnvExpression = (
	sourceFile: ts.SourceFile,
): ts.Expression | undefined => {
	for (const statement of sourceFile.statements) {
		if (!ts.isVariableStatement(statement)) continue;
		const hasExport = statement.modifiers?.some(
			(modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
		);
		if (!hasExport) continue;

		for (const declaration of statement.declarationList.declarations) {
			if (
				ts.isIdentifier(declaration.name) &&
				declaration.name.text === "env" &&
				declaration.initializer
			) {
				return declaration.initializer;
			}
		}
	}
};

/**
 * Maps top-level declarations by name so artifacts can pull in dependencies.
 */
const getTopLevelDeclarations = (sourceFile: ts.SourceFile) => {
	const declarations = new Map<string, ts.Statement>();

	for (const statement of sourceFile.statements) {
		if (ts.isImportDeclaration(statement) || ts.isExportAssignment(statement)) {
			continue;
		}

		const names = collectDeclaredNames(statement);
		for (const name of names) {
			declarations.set(name, statement);
		}
	}

	return declarations;
};

/**
 * Walks from an artifact expression to the top-level statements it depends on.
 */
const resolveNeededStatements = (
	sourceFile: ts.SourceFile,
	rootNode: ts.Node | undefined,
) => {
	const declarations = getTopLevelDeclarations(sourceFile);
	const queue = rootNode
		? Array.from(collectReferencedIdentifiers(rootNode))
		: [];
	const neededStatements = new Set<ts.Statement>();
	const neededIdentifiers = new Set(queue);

	while (queue.length > 0) {
		const identifier = queue.shift();
		if (!identifier) continue;

		const declaration = declarations.get(identifier);
		if (!declaration || neededStatements.has(declaration)) {
			continue;
		}

		neededStatements.add(declaration);

		for (const referenced of collectReferencedIdentifiers(declaration)) {
			if (neededIdentifiers.has(referenced)) continue;
			neededIdentifiers.add(referenced);
			queue.push(referenced);
		}
	}

	return {
		neededStatements,
		neededIdentifiers,
	};
};

/**
 * Renders a named import specifier while preserving aliases and type-only imports.
 */
const renderImportSpecifier = (
	sourceFile: ts.SourceFile,
	specifier: ts.ImportSpecifier,
) => {
	const importedName = specifier.propertyName
		? `${specifier.propertyName.getText(sourceFile)} as ${specifier.name.getText(sourceFile)}`
		: specifier.name.getText(sourceFile);

	return specifier.isTypeOnly ? `type ${importedName}` : importedName;
};

const ensureRelativeImportPath = (importPath: string) =>
	importPath.startsWith(".") ? importPath : `./${importPath}`;

const toImportPath = (filePath: string) => filePath.split(path.sep).join("/");

/**
 * Rewrites relative imports so generated artifacts can live in the output tree.
 */
const rewriteRelativeImportPath = (props: {
	modulePath: string;
	sourceFile: ts.SourceFile;
	target: ConfigArtifactKey;
	outputPath: string;
}) => {
	if (!props.modulePath.startsWith(".")) {
		return props.modulePath;
	}

	const sourceDir = path.dirname(props.sourceFile.fileName);
	const artifactDir = path.dirname(
		path.join(props.outputPath, `${configArtifactEntries[props.target]}.ts`),
	);
	const resolvedModulePath = path.resolve(sourceDir, props.modulePath);
	const relativeModulePath = path.relative(artifactDir, resolvedModulePath);

	return ensureRelativeImportPath(toImportPath(relativeModulePath));
};

/**
 * Renders an import with only the specifiers required by a generated artifact.
 */
const renderImport = (
	sourceFile: ts.SourceFile,
	statement: ts.ImportDeclaration,
	neededIdentifiers: Set<string>,
	target: ConfigArtifactKey,
	outputPath: string,
) => {
	const importClause = statement.importClause;

	if (!importClause) {
		return undefined;
	}

	const parts: string[] = [];

	if (importClause.name && neededIdentifiers.has(importClause.name.text)) {
		parts.push(importClause.name.text);
	}

	if (importClause.namedBindings) {
		if (ts.isNamespaceImport(importClause.namedBindings)) {
			if (neededIdentifiers.has(importClause.namedBindings.name.text)) {
				parts.push(`* as ${importClause.namedBindings.name.text}`);
			}
		} else {
			const namedSpecifiers = importClause.namedBindings.elements.filter(
				(specifier) => neededIdentifiers.has(specifier.name.text),
			);

			if (namedSpecifiers.length > 0) {
				parts.push(
					`{ ${namedSpecifiers
						.map((specifier) => renderImportSpecifier(sourceFile, specifier))
						.join(", ")} }`,
				);
			}
		}
	}

	if (parts.length === 0) {
		return undefined;
	}

	const modulePath = ts.isStringLiteral(statement.moduleSpecifier)
		? statement.moduleSpecifier.text
		: statement.moduleSpecifier.getText(sourceFile);
	const runtimeSafeModulePath =
		target === "runtime"
			? (runtimeSafeImportPaths.get(modulePath) ?? modulePath)
			: modulePath;
	const rewrittenModulePath = rewriteRelativeImportPath({
		modulePath: runtimeSafeModulePath,
		sourceFile,
		target,
		outputPath,
	});
	const typeKeyword = importClause.isTypeOnly ? " type" : "";

	return `import${typeKeyword} ${parts.join(", ")} from ${JSON.stringify(
		rewrittenModulePath,
	)};`;
};

/**
 * Builds the source text for one split config artifact.
 */
const renderArtifactSource = (props: {
	sourceFile: ts.SourceFile;
	target: ConfigArtifactKey;
	outputPath: string;
	expression?: ts.Expression;
}) => {
	const { neededStatements, neededIdentifiers } = resolveNeededStatements(
		props.sourceFile,
		props.expression,
	);
	const sections: string[] = [];

	for (const statement of props.sourceFile.statements) {
		if (!ts.isImportDeclaration(statement)) continue;

		const rendered = renderImport(
			props.sourceFile,
			statement,
			neededIdentifiers,
			props.target,
			props.outputPath,
		);

		if (rendered) {
			sections.push(rendered);
		}
	}

	for (const statement of props.sourceFile.statements) {
		if (!neededStatements.has(statement)) continue;

		sections.push(
			stripExportModifier(getStatementText(props.sourceFile, statement)),
		);
	}

	if (props.target === "env") {
		if (props.expression) {
			sections.push(
				`export const env = ${props.expression.getText(props.sourceFile)};`,
			);
		} else {
			sections.push("export {};");
		}
	} else {
		if (!props.expression) {
			throw new LucidError({
				message: `Lucid config is missing the \`${props.target}\` artifact expression.`,
			});
		}
		sections.push(
			`export default ${props.expression.getText(props.sourceFile)};`,
		);
	}

	return `${sections.join("\n\n")}\n`;
};

/**
 * Splits a `configureLucid` config file into runtime, db, env and config modules.
 */
const prepareConfigArtifacts = async (props: {
	configPath: string;
	outputPath: string;
}): Promise<PreparedConfigArtifacts> => {
	const source = await readFile(props.configPath, "utf-8");
	const sourceFile = ts.createSourceFile(
		props.configPath,
		source,
		ts.ScriptTarget.Latest,
		true,
		getScriptKind(props.configPath),
	);
	const definition = findDefaultConfigureCall(sourceFile);
	const expressions = {
		config: getObjectPropertyExpression(definition, artifactProperties.config),
		db: getObjectPropertyExpression(definition, artifactProperties.db),
		runtime: getObjectPropertyExpression(
			definition,
			artifactProperties.runtime,
		),
		env: getExportedEnvExpression(sourceFile),
	};
	const artifacts = Object.fromEntries(
		Object.entries(configArtifactEntries).map(([key, entry]) => [
			key,
			path.join(props.outputPath, `${entry}.ts`),
		]),
	) as PreparedConfigArtifacts;

	await mkdir(path.join(props.outputPath, "lucid"), { recursive: true });

	await Promise.all(
		Object.entries(artifacts).map(async ([key, filePath]) => {
			const target = key as ConfigArtifactKey;
			await writeFile(
				filePath,
				renderArtifactSource({
					sourceFile,
					target,
					outputPath: props.outputPath,
					expression: expressions[target],
				}),
			);
		}),
	);

	return artifacts;
};

export default prepareConfigArtifacts;
