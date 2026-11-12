/**
 * What a CMS config's files import: the environment the harness gives a setup, and what its
 * fragments must agree on with the harness's client and fakes. A Worker bundles it, so it only
 * exports what runs there.
 */
export { CAPTCHA_TOKEN, CLIENT_ADDRESS_HEADER } from "../client/contract.ts";
export {
	callTool,
	encodeScript,
	finishRoutine,
} from "../fakes/lucid-api/script.ts";
export { OUTBOX_ADAPTER_KEY, type OutboxEmail } from "../fakes/outbox.ts";
export { harnessEnv, type HarnessEnv } from "../setup/harness-env.ts";
export { VARIANTS, type Variant } from "../setup/variants.ts";
export { files, type MediaFile } from "../utils/media-files.ts";
