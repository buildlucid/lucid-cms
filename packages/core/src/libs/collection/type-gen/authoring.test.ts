import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import ts from "typescript";
import { expect, test } from "vitest";
import BrickBuilder from "../builders/brick-builder/index.js";
import CollectionBuilder from "../builders/collection-builder/index.js";
import generateCollectionClientTypes from "./index.js";

test("generated toolkit inputs and patch paths type-check real calls", async () => {
	const collection = new CollectionBuilder("typed_article", {
		mode: "multiple",
		localized: true,
		details: { labels: { singular: "Article", plural: "Articles" } },
		bricks: {
			builder: [
				new BrickBuilder("hero").addText("heading", { localized: true }),
			],
		},
	})
		.addText("title", { localized: true })
		.addJSON("settings")
		.addRepeater("links")
		.addText("label", { localized: false })
		.endRepeater()
		.addRelation("related", {
			collection: "typed_article",
			localized: false,
			multiple: true,
		});
	const generated = generateCollectionClientTypes({
		collections: [collection],
		localization: {
			defaultLocale: "en",
			locales: [{ code: "en" }, { code: "fr" }],
		},
	});
	const directory = await mkdtemp(join(tmpdir(), "lucid-authoring-types-"));
	try {
		const augmentation = generated.moduleAugmentations.find(
			(item) => item.module === "@lucidcms/core/types",
		);
		expect(augmentation).toBeDefined();
		await writeFile(
			join(directory, "generated.mts"),
			[
				...generated.imports,
				...generated.declarations,
				`declare module "@lucidcms/core/types" { ${augmentation?.declarations.join("\n")} }`,
			].join("\n"),
		);
		const script = join(directory, "usage.mts");
		await writeFile(
			script,
			`
import "./generated.mjs";
import type { Toolkit, DocumentEditToken } from "@lucidcms/core/types";
declare const toolkit: Toolkit;
declare const token: DocumentEditToken;
const actor = { kind: "system" } as const;
toolkit.documents.createSingle({ collectionKey: "typed_article", actor, data: { fields: { title: { en: "Hello" }, links: [{ fields: { label: "Label" } }] } } });
toolkit.documents.updateSingle({ collectionKey: "typed_article", id: 1, actor, ifUnchanged: token, data: { fields: { title: { fr: "Bonjour" } } } });
toolkit.documents.patchSingle({ collectionKey: "typed_article", id: 1, actor, operations: [{ op: "set", path: ["fields", "links", { ref: "item" }, "fields", "label"], value: "Updated" }] });
toolkit.documents.patchSingle({ collectionKey: "typed_article", id: 1, actor, operations: [{ op: "set", path: ["bricks", "builder", { key: "hero", ref: "item" }, "fields", "heading", "en"], value: "Heading" }] });
// @ts-expect-error Unknown fields are rejected for generated collections.
toolkit.documents.updateSingle({ collectionKey: "typed_article", id: 1, actor, data: { fields: { typo: true } } });
// @ts-expect-error Locale maps only accept enabled locales.
toolkit.documents.updateSingle({ collectionKey: "typed_article", id: 1, actor, data: { fields: { title: { de: "Wrong locale" } } } });
// @ts-expect-error Values retain their field type.
toolkit.documents.updateSingle({ collectionKey: "typed_article", id: 1, actor, data: { fields: { title: { en: 123 } } } });
// @ts-expect-error Edit tokens cannot be confused with arbitrary strings.
toolkit.documents.updateSingle({ collectionKey: "typed_article", id: 1, actor, ifUnchanged: "latest", data: {} });
// @ts-expect-error JSON is a whole value, not a traversable field group.
toolkit.documents.patchSingle({ collectionKey: "typed_article", id: 1, actor, operations: [{ op: "set", path: ["fields", "settings", "nested"], value: true }] });
// @ts-expect-error The selected text field needs a string or null.
toolkit.documents.patchSingle({ collectionKey: "typed_article", id: 1, actor, operations: [{ op: "set", path: ["fields", "title", "en"], value: 123 }] });
// @ts-expect-error Connections use the collection-aware relation value.
toolkit.documents.patchSingle({ collectionKey: "typed_article", id: 1, actor, operations: [{ op: "connect", path: ["fields", "related"], values: [{ collectionKey: "other", id: 1 }] }] });
const result = await toolkit.documents.getEditable({ collectionKey: "typed_article", id: 1 });
if (result.data) {
    const title: string | null = result.data.data.fields.title.en;
    const ref: string | undefined = result.data.data.fields.links[0]?.ref;
}
`,
		);
		const root = resolve(import.meta.dirname, "../../../../../..");
		const program = ts.createProgram([script], {
			target: ts.ScriptTarget.ESNext,
			module: ts.ModuleKind.NodeNext,
			moduleResolution: ts.ModuleResolutionKind.NodeNext,
			strict: true,
			skipLibCheck: true,
			noEmit: true,
			esModuleInterop: true,
			resolveJsonModule: true,
			paths: {
				"@lucidcms/core/types": [
					join(root, "packages/core/src/exports/types.ts"),
				],
				"@lucidcms/db-sqlite": [join(root, "packages/db-sqlite/src/index.ts")],
				"@lucidcms/runtime-node": [
					join(root, "packages/runtime-node/src/index.ts"),
				],
			},
		});
		const diagnostics = ts
			.getPreEmitDiagnostics(program)
			.map(
				(diagnostic) =>
					`${diagnostic.file?.fileName}:${diagnostic.start}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`,
			);
		expect(diagnostics).toEqual([]);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}, 30000);
