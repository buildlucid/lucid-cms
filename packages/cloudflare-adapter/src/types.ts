export type CloudflareWorkerImport = {
	path: string;
	default?: string;
	exports?: string[];
};

export type CloudflareWorkerExport = {
	name: string;
	content: string;
	async?: boolean;
	params?: string[];
};

export type CloudflareWorkerExportArtifact = {
	imports: CloudflareWorkerImport[];
	exports: CloudflareWorkerExport[];
};

export type CloudflareWorkerEntryArtifact = {
	filename: string;
	imports: CloudflareWorkerImport[];
	exports: CloudflareWorkerExport[];
};
