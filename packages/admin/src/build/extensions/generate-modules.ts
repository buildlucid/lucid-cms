import type { HtmlTagDescriptor } from "vite";
import { brickSlotKeys } from "../../components/BrickSlots/constants.js";
import { fieldSlotKeys } from "../../components/FieldSlots/constants.js";
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
		? `${load}.then(module => ({ default: module[${JSON.stringify(reference.export)}] }))`
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
				key,
				path,
				navigation,
				shell = "navigation",
				access = "authenticated",
			}) =>
				componentEntry(
					{ key, path: `/lucid/e/${path}`, navigation, shell, access },
					component,
					`route "${key}"`,
					resolve,
				),
		),
	);

	const slots = await Promise.all(
		(admin.slots ?? []).map(async ({ component, match = {}, ...metadata }) => ({
			slot: metadata.slot,
			entry: await componentEntry(
				{ ...metadata, match },
				component,
				`slot "${metadata.key}"`,
				resolve,
			),
		})),
	);

	const brickSlots = slots.filter(
		({ slot }) =>
			slot === brickSlotKeys.header ||
			slot === brickSlotKeys.beforeFields ||
			slot === brickSlotKeys.afterFields ||
			slot === brickSlotKeys.left ||
			slot === brickSlotKeys.right,
	);

	const documentSlots = slots.filter(
		({ slot }) =>
			slot === "document.columnAddition" || slot === "document.columnOverride",
	);
	const fieldSlots = slots.filter(
		({ slot }) => slot === fieldSlotKeys.before || slot === fieldSlotKeys.after,
	);

	return [
		'import { lazy } from "solid-js";',
		`export const routes = [${routes.join(",\n")}];`,
		`export const brickSlots = [${brickSlots.map(({ entry }) => entry).join(",\n")}];`,
		`export const documentSlots = [${documentSlots.map(({ entry }) => entry).join(",\n")}];`,
		`export const fieldSlots = [${fieldSlots.map(({ entry }) => entry).join(",\n")}];`,
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
				else imports.push(`import ${JSON.stringify(id)};`);
			}
		}
	}
	return { code: imports.join("\n"), stylesheets, tags };
};
