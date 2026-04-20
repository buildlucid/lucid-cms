import type { Locale } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getAll from "../get-all.js";

const getAllClient: ServiceFn<[], Locale[]> = async (context) =>
	getAll(context);

export default getAllClient;
