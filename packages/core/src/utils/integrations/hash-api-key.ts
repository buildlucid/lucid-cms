import { createHmac } from "node:crypto";
import type { ServiceContext } from "../services/types.js";

/** Uses a keyed hash for random credentials, requiring the encryption secret as well as the database. */
const hashApiKey = (context: ServiceContext, apiKey: string) =>
	createHmac("sha256", context.config.secrets.encryption)
		.update("lucid-integration:api-key\0", "utf8")
		.update(apiKey, "utf8")
		.digest("hex");

export default hashApiKey;
