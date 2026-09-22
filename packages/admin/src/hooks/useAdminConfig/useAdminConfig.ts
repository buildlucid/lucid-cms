import config from "virtual:lucid-admin-config";
import type { AdminClientConfig } from "../../types/client-config.js";

/** Returns the admin's client config. */
export const useAdminConfig = (): AdminClientConfig => config;
