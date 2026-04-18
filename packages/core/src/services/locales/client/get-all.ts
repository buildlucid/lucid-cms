import type { LocalesResponse } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getAll from "../get-all.js";

const getAllClient: ServiceFn<[], LocalesResponse[]> = async (context) =>
	getAll(context);

export default getAllClient;
