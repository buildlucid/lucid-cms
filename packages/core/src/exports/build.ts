import constants from "../constants/constants.js";

export { buildAdmin } from "@lucidcms/admin/build";
export { default as createAdminClientConfig } from "../libs/admin/create-client-config.js";
export { default as getConfigPath } from "../libs/config/get-config-path.js";
export { default as loadConfigFile } from "../libs/config/load-config-file.js";
export { default as resolveConfigDefinition } from "../libs/config/resolve-config-definition.js";

/** The module ID runtime entries import the built project, a `LucidBuild`, from. */
export const buildModuleId = constants.build.moduleId;
/** The module a host's server imports the runtime's `HostedLucid` from. */
export const hostedModuleId = constants.build.hostedModuleId;
