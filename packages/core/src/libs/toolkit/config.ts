import type { EnvironmentVariables } from "../../libs/runtime/types.js";
import type { Config } from "../../types/config.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import type { TranslationStore } from "../i18n/types.js";
import type { CreateToolkitServiceContextOptions } from "./types.js";

/**
 * Builds a toolkit-ready service context from resolved Lucid runtime values.
 */
export const createToolkitServiceContext = (
	options: CreateToolkitServiceContextOptions,
): ServiceContext => createServiceContext(options);

export type { Config, EnvironmentVariables, TranslationStore };
