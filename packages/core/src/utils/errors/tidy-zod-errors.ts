import z, { type ZodError } from "zod/v4";

/**
 * Removes the "Invalid input: " prefix that zod adds to messages.
 */
// export const removeInvalidInputPrefix = (errorMessage: string): string => {
// 	const prefix = "Invalid input: ";
// 	if (errorMessage.startsWith(prefix)) {
// 		const withoutPrefix = errorMessage.substring(prefix.length);
// 		return withoutPrefix.charAt(0).toUpperCase() + withoutPrefix.slice(1);
// 	}
// 	return errorMessage;
// };

/**
 * Formatting on top of Zod prettyError
 */
const tidyZodError = (error: ZodError): string => {
	// return removeInvalidInputPrefix(z.prettifyError(error));
	return z.prettifyError(error).replace(/✖/g, "");
};

export default tidyZodError;
