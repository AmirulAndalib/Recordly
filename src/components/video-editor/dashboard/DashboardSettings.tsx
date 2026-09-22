import { createContext, useContext, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
export const DashboardSettingsContext = createContext<ReactNode>(null);
export function DashboardSettings() {
	const settingsContent = useContext(DashboardSettingsContext);
	const [directory, setDirectory] = useState("");
	return (
		<section aria-label="Dashboard settings" className="dashboard-settings max-w-2xl py-10">
			<h1 className="mb-8 text-lg font-semibold">Settings</h1>
			<div className="space-y-8">
				{settingsContent}
				<div className="flex items-center justify-between gap-8">
					<div>
						<p className="text-sm">Projects folder</p>
						{directory && (
							<p
								className="mt-1 max-w-xs truncate text-xs text-muted-foreground"
								title={directory}
							>
								{directory}
							</p>
						)}
					</div>
					<Button
						variant="secondary"
						onClick={async () => {
							try {
								const result = await window.electronAPI.getProjectsDirectory();
								if (!result.success || !result.path)
									throw Error("Could not open projects folder");
								setDirectory(result.path);
								await window.electronAPI.revealInFolder(result.path);
							} catch (e) {
								toast.error(String(e));
							}
						}}
					>
						Show folder
					</Button>
				</div>
				<p className="text-xs text-muted-foreground">
					Named projects save automatically. Previews refresh when you return to Projects.
				</p>
			</div>
		</section>
	);
}
