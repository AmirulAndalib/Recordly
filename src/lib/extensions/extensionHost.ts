/**
 * Disabled extension-host compatibility surface.
 *
 * The editor still calls several rendering and state methods while legacy
 * extension contributions are phased out. Activation is deliberately blocked,
 * so these methods remain empty unless old in-memory contributions are cleaned up.
 */

import type {
	ContributedCursorStyle,
	ContributedWallpaper,
	CursorEffectContext,
	CursorEffectFn,
	ExtensionEvent,
	ExtensionEventHandler,
	ExtensionEventType,
	ExtensionInfo,
	ExtensionSettingsPanel,
	FrameInstance,
	RecordlyExtensionModule,
	RenderHookContext,
	RenderHookFn,
	RenderHookPhase,
} from "./types";

const EXTENSION_SETTINGS_STORAGE_KEY = "recordly.extension-settings.v1";

interface RegisteredRenderHook {
	extensionId: string;
	phase: RenderHookPhase;
	hook: RenderHookFn;
}

interface RegisteredCursorEffect {
	extensionId: string;
	effect: CursorEffectFn;
}

interface RegisteredSettingsPanel {
	extensionId: string;
	panel: ExtensionSettingsPanel;
}

interface RegisteredWallpaper {
	id: string;
	extensionId: string;
	wallpaper: ContributedWallpaper;
	/** Resolved absolute URL to the wallpaper file */
	resolvedUrl: string;
	/** Resolved absolute URL to the thumbnail (or resolvedUrl if absent) */
	resolvedThumbnailUrl: string;
}

interface RegisteredCursorStyle {
	id: string;
	extensionId: string;
	cursorStyle: ContributedCursorStyle;
	/** Resolved absolute URL to the default cursor image */
	resolvedDefaultUrl: string;
	/** Resolved absolute URL to the click image (if provided) */
	resolvedClickUrl?: string;
}

interface ActiveExtension {
	info: ExtensionInfo;
	module: RecordlyExtensionModule;
	disposables: (() => void)[];
}

/**
 * The Extension Host manages all loaded extensions and provides
 * access to their registered hooks, effects, and settings.
 */
export class ExtensionHost {
	private activeExtensions = new Map<string, ActiveExtension>();
	private renderHooks: RegisteredRenderHook[] = [];
	private cursorEffects: RegisteredCursorEffect[] = [];
	private frames: FrameInstance[] = [];
	private eventHandlers = new Map<
		ExtensionEventType,
		{ extensionId: string; handler: ExtensionEventHandler }[]
	>();
	private settingsPanels: RegisteredSettingsPanel[] = [];
	private wallpapers: RegisteredWallpaper[] = [];
	private cursorStyles: RegisteredCursorStyle[] = [];
	private extensionSettings = new Map<string, Record<string, unknown>>();
	private settingChangeCallbacks = new Map<
		string,
		Set<(settingId: string, value: unknown) => void>
	>();
	private listeners = new Set<() => void>();
	private fullSettingsStore: Record<string, Record<string, unknown>> | null = null;
	private persistTimeout: ReturnType<typeof setTimeout> | null = null;

	// Retained for the editor's existing video-info query path.
	private _videoInfo: { width: number; height: number; durationMs: number; fps: number } | null =
		null;

	constructor() {
		if (typeof window !== "undefined") {
			window.addEventListener("beforeunload", () => {
				this.flushPersistedSettings();
			});
		}
	}

	/**
	 * Activate an extension given its info and resolved module URL.
	 */
	async activateExtension(info: ExtensionInfo, moduleUrl: string): Promise<void> {
		void moduleUrl;
		throw new Error(`Extensions are no longer available in Recordly (${info.manifest.id}).`);
	}

	/**
	 * Deactivate an extension by ID.
	 */
	async deactivateExtension(extensionId: string): Promise<void> {
		const active = this.activeExtensions.get(extensionId);
		if (!active) return;

		try {
			await active.module.deactivate?.();
		} catch (err) {
			console.warn(`[extensions] Error during deactivate of ${extensionId}:`, err);
		}

		// Clean up all disposables (unregister hooks, effects, handlers)
		for (const dispose of active.disposables) {
			try {
				dispose();
			} catch {
				/* ignore */
			}
		}

		this.activeExtensions.delete(extensionId);
		this.flushPersistedSettings();
		this.notifyListeners();
		console.log(`[extensions] Deactivated: ${extensionId}`);
	}

	/**
	 * Deactivate all extensions.
	 */
	async deactivateAll(): Promise<void> {
		const ids = Array.from(this.activeExtensions.keys());
		for (const id of ids) {
			await this.deactivateExtension(id);
		}
		this.flushPersistedSettings();
	}

	// ---------------------------------------------------------------------------
	// Render Pipeline Integration
	// ---------------------------------------------------------------------------

	/**
	 * Execute all render hooks for a given phase.
	 */
	executeRenderHooks(phase: RenderHookPhase, context: RenderHookContext): void {
		const hooks = this.renderHooks.filter((h) => h.phase === phase);
		for (const hook of hooks) {
			context.ctx.save();
			try {
				hook.hook(context);
			} catch (err) {
				console.warn(
					`[extensions] Render hook error (${hook.extensionId}, ${phase}):`,
					err,
				);
			} finally {
				context.ctx.restore();
			}
		}
	}

	/**
	 * Execute all cursor effects. Returns true if any effect is still animating.
	 */
	executeCursorEffects(context: CursorEffectContext): boolean {
		let anyActive = false;
		for (const effect of this.cursorEffects) {
			context.ctx.save();
			try {
				const stillActive = effect.effect(context);
				if (stillActive) anyActive = true;
			} catch (err) {
				console.warn(`[extensions] Cursor effect error (${effect.extensionId}):`, err);
			} finally {
				context.ctx.restore();
			}
		}
		return anyActive;
	}

	/**
	 * Emit an event to all registered handlers.
	 */
	emitEvent(event: ExtensionEvent): void {
		const handlers = this.eventHandlers.get(event.type);
		if (!handlers) return;

		for (const { handler } of handlers) {
			try {
				handler(event);
			} catch (err) {
				console.warn(`[extensions] Event handler error (${event.type}):`, err);
			}
		}
	}

	// ---------------------------------------------------------------------------
	// Queries
	// ---------------------------------------------------------------------------

	getActiveExtensions(): ExtensionInfo[] {
		return Array.from(this.activeExtensions.values()).map((a) => a.info);
	}

	/** Quick snapshot of video info for callers that need durationMs etc. */
	getVideoInfoSnapshot(): {
		width: number;
		height: number;
		durationMs: number;
		fps: number;
	} | null {
		return this._videoInfo;
	}

	getSettingsPanels(): RegisteredSettingsPanel[] {
		return [...this.settingsPanels];
	}

	hasRenderHooks(phase: RenderHookPhase): boolean {
		return this.renderHooks.some((h) => h.phase === phase);
	}

	hasCursorEffects(): boolean {
		return this.cursorEffects.length > 0;
	}

	getExtensionSetting(extensionId: string, settingId: string): unknown {
		this.ensureExtensionSettingsLoaded(extensionId);
		return this.extensionSettings.get(extensionId)?.[settingId];
	}

	setExtensionSetting(extensionId: string, settingId: string, value: unknown): void {
		this.ensureExtensionSettingsLoaded(extensionId);
		this.extensionSettings.get(extensionId)![settingId] = value;
		this.persistExtensionSettings(extensionId);
		// Notify per-extension setting change listeners
		const cbs = this.settingChangeCallbacks.get(extensionId);
		if (cbs) {
			for (const cb of cbs) {
				try {
					cb(settingId, value);
				} catch {
					/* ignore */
				}
			}
		}
		this.notifyListeners();
	}

	/**
	 * Get all registered device frames from active extensions.
	 */
	getFrames(): FrameInstance[] {
		return [...this.frames];
	}

	/**
	 * Get all contributed wallpapers from active extensions.
	 */
	getContributedWallpapers(): RegisteredWallpaper[] {
		return [...this.wallpapers];
	}

	/**
	 * Get all contributed cursor styles from active extensions.
	 */
	getContributedCursorStyles(): RegisteredCursorStyle[] {
		return [...this.cursorStyles];
	}

	/**
	 * Subscribe to changes in extensions (activation/deactivation).
	 */
	onChange(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	// ---------------------------------------------------------------------------
	// Legacy shared-state setters retained until their editor call sites are removed.
	// ---------------------------------------------------------------------------

	setVideoInfo(
		info: { width: number; height: number; durationMs: number; fps: number } | null,
	): void {
		this._videoInfo = info;
	}

	setVideoLayout(
		layout: {
			maskRect: { x: number; y: number; width: number; height: number };
			canvasWidth: number;
			canvasHeight: number;
			borderRadius: number;
			padding: number | { top: number; right: number; bottom: number; left: number };
		} | null,
	): void {
		void layout;
	}

	setZoomState(
		state: { scale: number; focusX: number; focusY: number; progress: number } | null,
	): void {
		void state;
	}

	setShadowConfig(config: { enabled: boolean; intensity: number }): void {
		void config;
	}

	setCursorTelemetry(
		telemetry: Array<{
			timeMs: number;
			cx: number;
			cy: number;
			interactionType?: string;
			pressure?: number;
		}>,
	): void {
		void telemetry;
	}

	setSmoothedCursor(
		cursor: {
			timeMs: number;
			cx: number;
			cy: number;
			trail: Array<{ cx: number; cy: number }>;
		} | null,
	): void {
		void cursor;
	}

	setKeystrokeEvents(events: Array<{ timeMs: number; key: string; modifiers: string[] }>): void {
		void events;
	}

	setActiveFrame(frameId: string | null): void {
		void frameId;
	}

	setPlaybackState(
		state: { currentTimeMs: number; durationMs: number; isPlaying: boolean } | null,
	): void {
		void state;
	}

	// ---------------------------------------------------------------------------
	// Private
	// ---------------------------------------------------------------------------

	private notifyListeners(): void {
		for (const listener of this.listeners) {
			try {
				listener();
			} catch {
				/* ignore */
			}
		}
	}

	private readPersistedSettingsStore(): Record<string, Record<string, unknown>> {
		if (typeof window === "undefined" || !window.localStorage) {
			return {};
		}

		try {
			const raw = window.localStorage.getItem(EXTENSION_SETTINGS_STORAGE_KEY);
			if (!raw) {
				return {};
			}

			const parsed = JSON.parse(raw);
			if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
				return {};
			}

			return parsed as Record<string, Record<string, unknown>>;
		} catch {
			return {};
		}
	}

	private writePersistedSettingsStore(store: Record<string, Record<string, unknown>>): void {
		if (typeof window === "undefined" || !window.localStorage) {
			return;
		}

		try {
			window.localStorage.setItem(EXTENSION_SETTINGS_STORAGE_KEY, JSON.stringify(store));
		} catch {
			// Ignore storage quota / privacy mode failures.
		}
	}

	private getFullSettingsStore(): Record<string, Record<string, unknown>> {
		if (this.fullSettingsStore) {
			return this.fullSettingsStore;
		}
		this.fullSettingsStore = this.readPersistedSettingsStore();
		return this.fullSettingsStore;
	}

	private ensureExtensionSettingsLoaded(extensionId: string): void {
		if (this.extensionSettings.has(extensionId)) {
			return;
		}

		const store = this.getFullSettingsStore();
		const persisted = store[extensionId];
		const normalized =
			persisted && typeof persisted === "object" && !Array.isArray(persisted)
				? { ...persisted }
				: {};

		this.extensionSettings.set(extensionId, normalized);
	}

	private persistExtensionSettings(extensionId: string): void {
		const store = this.getFullSettingsStore();
		const settings = this.extensionSettings.get(extensionId) ?? {};

		if (Object.keys(settings).length === 0) {
			delete store[extensionId];
		} else {
			store[extensionId] = { ...settings };
		}

		// Debounce the actual write to localStorage to avoid blocking the UI thread during rapid changes
		if (this.persistTimeout) {
			clearTimeout(this.persistTimeout);
		}
		this.persistTimeout = setTimeout(() => {
			this.writePersistedSettingsStore(store);
			this.persistTimeout = null;
		}, 500);
	}

	private flushPersistedSettings(): void {
		if (this.persistTimeout) {
			clearTimeout(this.persistTimeout);
			this.persistTimeout = null;
		}
		this.writePersistedSettingsStore(this.getFullSettingsStore());
	}

	async syncConfiguredExtensions(discovered: ExtensionInfo[]): Promise<void> {
		void discovered;
		await this.deactivateAll();
	}

	// ---------------------------------------------------------------------------
	// Auto-Activation (idempotent — safe to call from multiple places)
	// ---------------------------------------------------------------------------

	private _autoActivatePromise: Promise<void> | null = null;

	/**
	 * Discover and activate all builtin extensions. Idempotent — only runs
	 * the discovery/activation sequence once no matter how many callers invoke it.
	 */
	autoActivateBuiltins(): Promise<void> {
		this._autoActivatePromise ??= Promise.resolve();
		return this._autoActivatePromise;
	}
}

/**
 * Singleton extension host instance for the renderer process.
 */
export const extensionHost = new ExtensionHost();
