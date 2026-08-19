import z from "zod";
import type { MediaAdapterData } from "../../types/response.js";

const mediaAdapterDataSchema: z.ZodType<MediaAdapterData> = z.record(
	z.string(),
	z.json(),
);

export default mediaAdapterDataSchema;
