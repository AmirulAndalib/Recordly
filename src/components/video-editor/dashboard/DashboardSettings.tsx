import { SettingsSections, SettingsCategory } from "../SettingsSections";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Switch } from "@/components/ui/switch";
import { supportsHudCaptureProtection } from "@/lib/hudCaptureProtection";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
export const DashboardSettingsContext = createContext<ReactNode>(null);
export function DashboardSettings({ onImportFile }: { onImportFile: () => Promise<void> }) {
	const settingsContent = useContext(DashboardSettingsContext);
	const [directory, setDirectory] = useState("");
	const [recordings, setRecordings] = useState("");
	const [hideHud, setHideHud] = useState(true);
	const [captureSupported, setCaptureSupported] = useState(false);
	const [busy, setBusy] = useState(false);
	const run = async (action: () => Promise<void>) => {
		setBusy(true);
		try {
			await action();
		} catch (error) {
			toast.error(String(error));
		} finally {
			setBusy(false);
		}
	};
	useEffect(() => {
		let active = true;
		void Promise.all([
			window.electronAPI.getRecordingsDirectory(),
			window.electronAPI.getHudOverlayCaptureProtection(),
			window.electronAPI.getPlatform(),
		])
			.then(([directory, protection, platform]) => {
				if (!active) return;
				if (directory.success) setRecordings(directory.path);
				if (protection.success) setHideHud(protection.enabled);
				setCaptureSupported(supportsHudCaptureProtection(platform));
			})
			.catch((error) => toast.error(String(error)));
		return () => {
			active = false;
		};
	}, []);
	return (
		<section aria-label="Dashboard settings" className="dashboard-settings max-w-2xl py-10">
			<h1 className="mb-8 text-lg font-semibold">Settings</h1>
			<SettingsSections categories={["general", "motion", "recording", "files", "advanced"]}>
				<SettingsCategory category={["general", "motion", "advanced"]}>
					{settingsContent}
				</SettingsCategory>
				<SettingsCategory category="files">
					<div className="flex items-center justify-between gap-8">
						<p className="text-sm">Open video or project</p>
						<Button
							variant="secondary"
							disabled={busy}
							onClick={() => void run(onImportFile)}
						>
							Open file
						</Button>
					</div>
				</SettingsCategory>
				<SettingsCategory category="recording">
					<div className="flex items-center justify-between gap-8">
						<div className="min-w-0">
							<p className="text-sm">Recordings folder</p>
							<p
								className="mt-1 truncate text-xs text-muted-foreground"
								title={recordings}
							>
								{recordings}
							</p>
						</div>
						<Button
							variant="secondary"
							disabled={busy}
							onClick={() =>
								void run(async () => {
									const result =
										await window.electronAPI.chooseRecordingsDirectory();
									if (result.canceled) return;
									if (!result.success || !result.path)
										throw Error("Could not change recordings folder");
									setRecordings(result.path);
								})
							}
						>
							Change folder
						</Button>
					</div>
					{captureSupported && (
						<div className="flex items-center justify-between gap-8">
							<div>
								<p className="text-sm">Hide HUD from recordings</p>
								<p className="mt-1 text-xs text-muted-foreground">
									Only while recording. The idle HUD stays visible in captures.
								</p>
							</div>
							<Switch
								aria-label="Hide HUD from recordings"
								checked={hideHud}
								disabled={busy}
								onCheckedChange={(enabled) =>
									void run(async () => {
										const result =
											await window.electronAPI.setHudOverlayCaptureProtection(
												enabled,
											);
										if (!result.success)
											throw Error("Could not update capture protection");
										setHideHud(result.enabled);
									})
								}
							/>
						</div>
					)}
				</SettingsCategory>
				<SettingsCategory category="advanced">
					{import.meta.env.DEV && (
						<div className="flex items-center justify-between gap-8">
							<p className="text-sm">Preview update UI</p>
							<Button
								variant="secondary"
								disabled={busy}
								onClick={() =>
									void run(async () => {
										await window.electronAPI.previewUpdateToast();
									})
								}
							>
								Preview
							</Button>
						</div>
					)}
				</SettingsCategory>
				<SettingsCategory category="files">
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
						Named projects save automatically. Previews refresh when you return to
						Projects.
					</p>
				</SettingsCategory>
			</SettingsSections>
		</section>
	);
}
