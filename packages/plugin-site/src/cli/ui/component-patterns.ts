/** Globs matching UI component files with the given extensions, relative to the site directory. */
const componentPatterns = (extensions: string[]) =>
	extensions.map((extension) => `**/*${extension}`);

export default componentPatterns;
