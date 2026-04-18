import { localeServices } from "../../../services/index.js";
import type { LocalesResponse } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import { runToolkitService } from "../utils.js";

const getAll = async (
	context: ServiceContext,
): ServiceResponse<LocalesResponse[]> =>
	runToolkitService(
		() => localeServices.client.getAll(context),
		"Lucid toolkit could not fetch locales.",
	);

export default getAll;
