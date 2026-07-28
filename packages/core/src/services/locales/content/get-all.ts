import type { Locale } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getAll from "../get-all.js";

const getAllContent: ServiceFn<[], Locale[]> = async (context) =>
	getAll(context);

export default getAllContent;
