import { Button, Drawer } from "@lucidcms/admin/components";
import { useTranslation } from "@lucidcms/admin/hooks";
import type { Component } from "solid-js";
import type {} from "../../translations.js";
import PreviousPathsContent from "./parts/PreviousPathsContent.jsx";

/** A bottom drawer listing the open page's previous paths, where editors can stop one redirecting. */
const PreviousPathsDrawer: Component<{
	open: boolean;
	onOpenChange: (open: boolean) => void;
}> = (props) => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();

	// ----------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.open}
			onOpenChange={props.onOpenChange}
			side="bottom"
		>
			<Drawer.Header>
				<Drawer.Title>{t("plugin.pages.previous.paths.title")}</Drawer.Title>
				<Drawer.Description>
					{t("plugin.pages.previous.paths.description")}
				</Drawer.Description>
			</Drawer.Header>
			<Drawer.Body>
				<PreviousPathsContent onClose={() => props.onOpenChange(false)} />
			</Drawer.Body>
			<Drawer.Footer>
				<Drawer.Actions>
					<Button
						size="md"
						variant="outline"
						onClick={() => props.onOpenChange(false)}
					>
						{t("common.close")}
					</Button>
				</Drawer.Actions>
			</Drawer.Footer>
		</Drawer.Root>
	);
};

export default PreviousPathsDrawer;
