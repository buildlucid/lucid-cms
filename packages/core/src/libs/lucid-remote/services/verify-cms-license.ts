import type { ServiceFn } from "../../../utils/services/types.js";
import { getLucidRemoteClient } from "../client.js";
import { lucidRemotePaths } from "../constants.js";
import type { LucidRemoteRequestData } from "../types.js";

type VerifyCmsLicenseProps = {
	licenseKey: string;
};

export type VerifyCmsLicenseData = {
	valid: boolean;
	message?: string;
	ai?: {
		enabled?: boolean;
	};
};

/**
 * Verifies a CMS license key against Lucid's remote licensing API.
 */
const verifyCmsLicense: ServiceFn<
	[VerifyCmsLicenseProps],
	LucidRemoteRequestData<VerifyCmsLicenseData>
> = async (context, props) => {
	const client = getLucidRemoteClient(context);

	return client.request<VerifyCmsLicenseData>(
		lucidRemotePaths.verifyCmsLicense,
		{
			retries: 1,
			method: "POST",
			body: {
				licenseKey: props.licenseKey,
			},
		},
	);
};

export default verifyCmsLicense;
