import z from "zod";

/** Finds the object schema that declares the variables, through pipes such as `.transform()` and `z.preprocess()`. */
const findEnvObject = (schema: z.core.$ZodType): z.ZodObject | undefined => {
	if (schema instanceof z.ZodObject) return schema;
	if (schema instanceof z.ZodPipe) {
		return findEnvObject(schema.in) ?? findEnvObject(schema.out);
	}
	return undefined;
};

/** Lists the variables an `env` schema declares, with whether each must be set, as optional and defaulted ones needn't be. */
const listEnvVariables = (schema: z.core.$ZodType | undefined) => {
	const object = schema && findEnvObject(schema);
	if (!object) return [];
	return Object.entries(object.shape).map(([name, field]) => ({
		name,
		required: !z.safeParse(field, undefined).success,
	}));
};

export default listEnvVariables;
