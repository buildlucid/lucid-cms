import type { TranslationRegistry } from "@lucidcms/admin/types";
import type messages from "../../translations/en.admin.json";

type TypesenseTranslations = TranslationRegistry<typeof messages>;
declare global {
	namespace LucidCMS {
		interface TranslationKeys extends TypesenseTranslations {}
	}
}
