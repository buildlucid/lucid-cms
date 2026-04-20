import { localeServices } from "../../../services/index.js";
import type { Locale } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { runToolkitService } from "../utils.js";

const getAll = async (context: ServiceContext): ServiceResponse<Locale[]> =>
	runToolkitService(
		() => localeServices.client.getAll(context),
		"Lucid toolkit could not fetch locales.",
	);

export default getAll;
