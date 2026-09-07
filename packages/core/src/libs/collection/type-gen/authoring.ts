import {
	type ContentContext,
	type DocumentShape,
	getDocumentShape,
} from "../helpers/get-document-shape.js";
import {
	dedupeStrings,
	stringLiteral,
	toPascalCaseIdentifier,
} from "./helpers.js";

type ValueShape = Extract<DocumentShape, { kind: "value" }>;

/**
 * Walks the same authoring structure used by document writes and emits TypeScript declarations.
 * Write values are partial; editable values include resolved defaults and item refs.
 * Patch paths follow the structure, while renderValue supplies each field's declared value type.
 */
export const generateAuthoringTypes = (
	context: ContentContext,
	renderValue: (shape: ValueShape) => {
		fieldType?: string;
		declarations: string[];
	},
) => {
	const shape = getDocumentShape(context);
	const declarations: string[] = [];
	const valueTypes = new Map<ValueShape, string>();
	const valueType = (shape: ValueShape) => {
		const existing = valueTypes.get(shape);
		if (existing) return existing;

		const value = renderValue(shape);
		declarations.push(...value.declarations);
		const type = value.fieldType ?? "unknown";
		valueTypes.set(shape, type);
		return type;
	};
	const render = (shape: DocumentShape, editable: boolean): string => {
		switch (shape.kind) {
			case "value":
				return `(${valueType(shape)}) | null`;
			case "object": {
				if (shape.children.size === 0) return "Record<string, never>";

				const members = [...shape.children].map(([key, child]) => {
					const optional = editable ? "" : "?";
					return `${stringLiteral(key)}${optional}: ${render(child, editable)};`;
				});
				return `{ ${members.join(" ")} }`;
			}
			case "items": {
				const optional = editable ? "" : "?";
				const fields = render(shape.fields, editable);
				return `Array<{ ref${optional}: string; fields: ${fields} }>`;
			}
			case "bricks": {
				const optional = editable || shape.embedded ? "" : "?";
				const variants = [...shape.fields].map(([key, fields]) => {
					const fieldType = render(fields, editable);
					return `{ ref${optional}: string; key: ${stringLiteral(key)}; fields: ${fieldType} }`;
				});
				return `Array<${variants.join(" | ") || "never"}>`;
			}
		}
	};
	const operations: string[] = [];
	const tuple = (path: string[]) => `[${path.join(", ")}]`;
	const visit = (shape: DocumentShape, path: string[]) => {
		if (path.length > 0)
			operations.push(
				`{ op: "set"; path: ${tuple(path)}; value: ${render(shape, false)} }`,
			);
		switch (shape.kind) {
			case "object":
				for (const [key, child] of shape.children)
					visit(child, [...path, stringLiteral(key)]);
				break;
			case "value":
				if (shape.relation)
					operations.push(
						`{ op: "connect" | "disconnect"; path: ${tuple(path)}; values: ${valueType(shape)} }`,
					);
				break;
			case "items":
			case "bricks": {
				operations.push(
					`{ op: "insert"; path: ${tuple(path)}; value: (${render(shape, false)})[number]; before?: string }`,
				);
				const fields =
					shape.kind === "items"
						? [[undefined, shape.fields] as const]
						: [...shape.fields];
				for (const [key, child] of fields) {
					const item = [
						...path,
						key === undefined
							? "{ ref: string }"
							: `{ key: ${stringLiteral(key)}; ref: string }`,
					];
					operations.push(
						`{ op: "remove"; path: ${tuple(item)} }`,
						`{ op: "move"; path: ${tuple(item)}; before?: string }`,
					);
					visit(child, [...item, '"fields"']);
				}
				break;
			}
		}
	};
	const prefix = `Collection${toPascalCaseIdentifier(context.collection.key, "Document")}`;
	const dataName = `${prefix}Data`;
	const editableName = `${prefix}Editable`;
	const patchName = `${prefix}Patch`;
	declarations.push(
		`export type ${dataName} = ${render(shape, false)};`,
		`export type ${editableName} = ${render(shape, true)};`,
	);
	visit(shape, []);
	declarations.push(
		`export type ${patchName} = ${operations.join(" | ") || "never"};`,
	);
	return {
		dataName,
		editableName,
		patchName,
		declarations: dedupeStrings(declarations),
	};
};
