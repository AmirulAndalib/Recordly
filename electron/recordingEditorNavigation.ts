import type { BrowserWindow } from "electron";

export function createRecordingEditorNavigation(createEditor: () => void) {
	let returnWindow: BrowserWindow | null = null;
	return {
		setReturnWindow(window: BrowserWindow | null) {
			returnWindow = window;
		},
		open() {
			const target = returnWindow;
			returnWindow = null;
			if (!target || target.isDestroyed()) {
				createEditor();
				return;
			}
			// Home flushed this editor's project before launching the HUD. Reload
			// from the finalized recording session, clearing the previous project UI.
			target.reload();
			if (target.isMinimized()) target.restore();
			target.show();
			target.focus();
		},
	};
}
