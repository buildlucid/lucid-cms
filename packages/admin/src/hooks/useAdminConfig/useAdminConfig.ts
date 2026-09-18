import config from "virtual:lucid-admin-config";
import type { AdminClientConfig } from "../../types/client-config.js";

/** Returns the readonly client config in any admin component, without an editor provider. */
export const useAdminConfig = (): AdminClientConfig => config;
