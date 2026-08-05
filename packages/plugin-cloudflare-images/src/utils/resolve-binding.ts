import type { ServiceContext } from "@lucidcms/core/types";

/** Whether an environment value exposes the Images binding methods we use. */
const isImagesBinding = (value: unknown): value is ImagesBinding =>
	typeof value === "object" &&
	value !== null &&
	"info" in value &&
	typeof value.info === "function" &&
	"input" in value &&
	typeof value.input === "function";

/** Resolves and structurally validates an Images binding from the runtime env. */
export const resolveImagesBinding = (
	context: ServiceContext,
	bindingName: string,
): ImagesBinding | undefined => {
	const binding = context.env?.[bindingName];
	return isImagesBinding(binding) ? binding : undefined;
};
