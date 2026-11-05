/** Browser entry for site previews: Lucid's toolbar, or the builder's runtime, which morphs the server-rendered page in place when its content changes. */
import { setupPreview } from "@lucidcms/client/preview";

setupPreview({ morph: true });
