import getAllLocales from "../../../services/locales/get-all.js";
import type { Locale } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { runToolkitService } from "../utils.js";

const getAll = async (context: ServiceContext): ServiceResponse<Locale[]> =>
	runToolkitService({
		handler: () => getAllLocales(context),
		name: {
			key: "core.toolkit.locales.get.all.error.name",
			defaultMessage: "Locales Toolkit Error",
		},
		message: {
			key: "core.toolkit.locales.get.all.error.message",
			defaultMessage: "Lucid toolkit could not fetch locales.",
		},
	});

export default getAll;
