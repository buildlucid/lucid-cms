import constants from "../../../constants/constants.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import { createTranslator, resolveInterfaceLocale } from "../../i18n/index.js";
import getClientAddress from "./get-client-address.js";

/** Builds a service context from the Hono context. */
const createServiceContext = (c: LucidHonoContext): ServiceContext => {
	const config = c.get("config");
	const env = c.get("env");
	const runtimeContext = c.get("runtimeContext");
	const db = c.get("db");

	const locale = resolveInterfaceLocale({
		config,
		locale: c.req.header(constants.headers.interfaceLocale),
		acceptLanguage: c.req.header("Accept-Language"),
	});
	const request = {
		url: c.req.url,
		ipAddress: getClientAddress(c),
		locale,
	};

	return {
		db,
		config,
		queue: c.get("queue"),
		env,
		runtimeContext,
		kv: c.get("kv"),
		mediaStorage: c.get("mediaStorage"),
		mediaDelivery: c.get("mediaDelivery"),
		email: c.get("email"),
		captcha: c.get("captcha"),
		agentRunner: c.get("agentRunner"),
		translate: createTranslator({ store: c.get("translationStore"), locale }),
		request,
	};
};

export default createServiceContext;
