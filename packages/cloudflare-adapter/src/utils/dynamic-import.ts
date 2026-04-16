const dynamicImport = async <R>(path: string): Promise<R> => {
	return await import(path);
};
export default dynamicImport;
