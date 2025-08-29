import type { ZodType } from "zod/v4";
import generateEnvTypes from "./env-type.js";
import { ensureLucidDirectoryExists } from "../../utils/helpers/lucid-directory.js";

const generateTypes = async (props: {
	envSchema?: ZodType;
	configPath: string;
}) => {
	const lucidDir = await ensureLucidDirectoryExists();

	await Promise.all([
		generateEnvTypes({
			lucidDir,
			schema: props.envSchema,
			configPath: props.configPath,
		}),
	]);
};

export default generateTypes;
