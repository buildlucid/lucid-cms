import type { JsonObject } from "../utils/json.ts";
import type { DatabaseDriver } from "./types.ts";

/**
 * Registers a driver. Its state type is checked here, then dropped, because templates cross
 * processes as plain data and only the driver that wrote one reads it back.
 */
const defineDriver = <State extends JsonObject>(
	driver: DatabaseDriver<State>,
): DatabaseDriver => driver as unknown as DatabaseDriver;

export default defineDriver;
