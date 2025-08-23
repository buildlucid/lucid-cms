export interface PluginOptions {
	/** The directory where the files will be uploaded */
	uploadDir: string;
	/** The secret key used to sign the URLs */
	secretKey: string;
}
