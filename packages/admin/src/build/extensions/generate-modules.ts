import type { HtmlTagDescriptor } from "vite";
import {
	type SlotSurface,
	slotDefinitions,
} from "../../extensions/slot-policy.js";
import type {
	AdminComponentReference,
	AdminConfig,
	AdminModulePath,
} from "../../extensions/types/config.js";

type ResolveModule = (
	reference: AdminModulePath,
	label: string,
) => Promise<string>;

/** Resolves the module without executing it and adapts named exports for Solid lazy. */
const componentEntry = async (
	metadata: object,
	reference: AdminComponentReference,
	label: string,
	resolve: ResolveModule,
) => {
	const named = typeof reference === "object" && "module" in reference;
	const moduleId = await resolve(named ? reference.module : reference, label);
	const load = `import(${JSON.stringify(moduleId)})`;
	const loader = named
		? `${load}.then(module => {
	const component = module[${JSON.stringify(reference.export)}];
	if (!component) throw new Error(${JSON.stringify(`Admin ${label}: "${String(reference.module)}" has no export "${reference.export}".`)});
	return { default: component };
})`
		: load;
	return `{ ...${JSON.stringify(metadata)}, component: lazy(() => ${loader}) }`;
};

/** Generates the registry without importing any user components on the server. */
export const generateRegistry = async (
	admin: AdminConfig,
	resolve: ResolveModule,
) => {
	const routes = await Promise.all(
		(admin.routes ?? []).map(
			async ({
				component,
				path,
				shell = "navigation",
				access = "authenticated",
				...metadata
			}) =>
				componentEntry(
					{ ...metadata, path: `/lucid/e/${path}`, shell, access },
					component,
					`route "${metadata.key}"`,
					resolve,
				),
		),
	);

	const slots: Record<SlotSurface, string[]> = {
		agentWidget: [],
		brick: [],
		field: [],
		documentList: [],
	};
	for (const { component, match = {}, ...metadata } of admin.slots ?? []) {
		slots[slotDefinitions[metadata.slot].surface].push(
			await componentEntry(
				{ ...metadata, match },
				component,
				`slot "${metadata.key}"`,
				resolve,
			),
		);
	}

	return [
		'import { lazy } from "solid-js";',
		`export const routes = [${routes.join(",\n")}];`,
		...Object.entries(slots).map(
			([surface, entries]) =>
				`export const ${surface}Slots = [${entries.join(",\n")}];`,
		),
	].join("\n");
};

/** Local CSS joins the admin stylesheet; scripts are modules and HTTPS assets are HTML tags. */
export const generateAssets = async (
	admin: AdminConfig,
	resolve: ResolveModule,
) => {
	const imports: string[] = [];
	const stylesheets: string[] = [];
	const tags: HtmlTagDescriptor[] = [];
	for (const kind of ["stylesheets", "scripts"] as const) {
		for (const reference of admin[kind] ?? []) {
			const source = String(reference);
			if (/^https:\/\//i.test(source)) {
				tags.push(
					kind === "scripts"
						? {
								tag: "script",
								attrs: { src: source, defer: true },
								injectTo: "head",
							}
						: {
								tag: "link",
								attrs: { rel: "stylesheet", href: source },
								injectTo: "head",
							},
				);
			} else {
				const id = await resolve(reference, kind);
				if (kind === "stylesheets") stylesheets.push(id);
				else {
					imports.push(`import ${JSON.stringify(id)};`);
				}
			}
		}
	}
	return { code: imports.join("\n"), stylesheets, tags };
};
