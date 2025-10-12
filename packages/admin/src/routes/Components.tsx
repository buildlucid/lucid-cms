import type { Component } from "solid-js";
import { DynamicContent, Wrapper } from "@/components/Groups/Layout";
import Button from "@/components/Partials/Button";
import { FaSolidXmark } from "solid-icons/fa";
import { Standard } from "@/components/Groups/Headers";
import InfoRow from "@/components/Blocks/InfoRow";
import PluginLoader from "@/components/PluginLoader";

const ComponentsRoute: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				header: (
					<Standard
						copy={{
							title: "Components",
							description: "A simple list of components for testing purposes",
						}}
					/>
				),
			}}
		>
			<DynamicContent
				options={{
					padding: "24",
				}}
			>
				<InfoRow.Root
					title={"Buttons"}
					description={"All of the available buttons"}
				>
					<InfoRow.Content title={"Medium Buttons"}>
						<div class="flex gap-2 flex-wrap">
							<Button
								size="medium"
								theme="primary"
								type="button"
								loading={false}
							>
								Primary
							</Button>
							<Button
								size="medium"
								theme="secondary"
								type="button"
								loading={false}
							>
								Secondary
							</Button>
							<Button
								size="medium"
								theme="border-outline"
								type="button"
								loading={false}
							>
								Border Outline
							</Button>
							<Button
								size="medium"
								theme="danger"
								type="button"
								loading={false}
							>
								Danger
							</Button>
							<Button size="medium" theme="basic" type="button" loading={false}>
								Basic
							</Button>
							<Button
								size="medium"
								theme="secondary-toggle"
								type="button"
								loading={false}
							>
								Secondary Toggle
							</Button>
							<Button
								size="medium"
								theme="danger-outline"
								type="button"
								loading={false}
							>
								Danger Outline
							</Button>
						</div>
					</InfoRow.Content>
					<InfoRow.Content title={"Icon Buttons"}>
						<div class="flex gap-2 flex-wrap">
							<Button type="button" theme="primary" size="icon">
								<FaSolidXmark />
							</Button>
							<Button type="button" theme="secondary" size="icon">
								<FaSolidXmark />
							</Button>
							<Button type="button" theme="border-outline" size="icon">
								<FaSolidXmark />
							</Button>
							<Button type="button" theme="danger" size="icon">
								<FaSolidXmark />
							</Button>
							<Button type="button" theme="basic" size="icon">
								<FaSolidXmark />
							</Button>
							<Button type="button" theme="secondary-toggle" size="icon">
								<FaSolidXmark />
							</Button>
							<Button type="button" theme="danger-outline" size="icon">
								<FaSolidXmark />
							</Button>
						</div>
					</InfoRow.Content>
				</InfoRow.Root>
				<InfoRow.Root
					title="Dynamic Plugin"
					description="A proof of concept for dynamic component plugin loading"
				>
					<PluginLoader />
				</InfoRow.Root>
			</DynamicContent>
		</Wrapper>
	);
};

export default ComponentsRoute;
