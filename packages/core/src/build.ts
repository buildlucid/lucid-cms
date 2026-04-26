import exportLazy from "./utils/helpers/export-lazy.js";

type RenderMjmlTemplates =
	typeof import("./libs/email/templates/render-mjml-templates.js")["default"];

export { default as migrateCommand } from "./libs/cli/commands/migrate.js";
export { default as getBuildPaths } from "./libs/cli/services/get-build-paths.js";
export { default as processBuildArtifacts } from "./libs/cli/services/process-build-artifacts.js";
export { default as loadBuildProject } from "./libs/compile/load-build-project.js";
export { default as prepareBuildArtifacts } from "./libs/compile/prepare-build-artifacts.js";
export { default as prepareLucidPublicAssets } from "./libs/compile/prepare-lucid-public-assets.js";
export { default as prepareLucidSPA } from "./libs/compile/prepare-lucid-spa.js";
export { default as getConfigPath } from "./libs/config/get-config-path.js";
export { default as resolveConfigDefinition } from "./libs/config/resolve-config-definition.js";
export { default as checkAllPluginsCompatibility } from "./libs/plugins/check-all-plugins-compatibility.js";
export { default as handlePluginBuildHooks } from "./libs/plugins/hooks/handle-build.js";
export { default as stripAdapterExportPlugin } from "./libs/runtime/plugins/strip-adapter-export-plugin.js";
export { default as stripImportsPlugin } from "./libs/runtime/plugins/strip-imports-plugin.js";

/**
 * MJML rendering is only needed during explicit build preparation, so this
 * export stays lazy to keep the general build surface free from email tooling
 * unless a caller opts into template rendering.
 */
export const renderMjmlTemplates = exportLazy<RenderMjmlTemplates>(
	() => import("./libs/email/templates/render-mjml-templates.js"),
);
