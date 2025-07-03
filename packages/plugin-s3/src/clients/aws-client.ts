import { AwsClient } from "aws4fetch";
import type { PluginOptions } from "../types/types.js";

let awsClient: AwsClient | null = null;

const getS3Client = (pluginOptions: PluginOptions) => {
	if (!awsClient) {
		awsClient = new AwsClient(pluginOptions.clientOptions);
	}

	return awsClient;
};

export default getS3Client;
