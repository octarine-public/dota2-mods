import "./translations"

import { MenuManager } from "./menu"

interface ModConfig {
	name: string
	dependencies?: string[]
}

new (class CDota2Minify {
	private readonly modIds: string[] = SharedSDK.readJSON("mods/index.json")
	private readonly config: Record<string, ModConfig> = SharedSDK.readJSON("mods/config.json")
	private readonly menu = new MenuManager(this.modIds, this.config)
	private readonly redirects = new Map<string, Record<string, string>>()
	private readonly handles = new Map<string, number>()

	constructor() {
		this.resolveRedirects()
		this.bindEvents()
		this.updateAll()
	}

	private resolveRedirects() {
		for (const mod of this.modIds) {
			const entries: Record<string, string> = SharedSDK.readJSON(
				`mods/${mod}/entry-point.json`
			)
			const resolved: Record<string, string> = {}
			for (const [key, val] of Object.entries(entries)) {
				const path = SharedSDK.tryFindFile(val)
				if (path !== undefined) {
					resolved[key] = path
				}
			}
			if (Object.keys(resolved).length > 0) {
				this.redirects.set(mod, resolved)
			}
		}
	}
	private bindEvents() {
		this.menu.State.OnValue(call => {
			FileSystem.EnableRedirects(call.value)
			this.updateAll()
		})
		for (const [mod, toggle] of this.menu.ModToggles) {
			toggle.OnValue(call => (call.value ? this.enableMod(mod) : this.disableMod(mod)))
		}
	}
	private enableMod(mod: string) {
		if (this.handles.has(mod)) return
		const redirects = this.redirects.get(mod)
		if (redirects !== undefined) {
			this.handles.set(mod, FileSystem.AddRedirectList(mod, redirects))
		}
		const deps = this.config[mod]?.dependencies
		if (deps !== undefined) {
			for (const dep of deps) {
				this.enableMod(dep)
				const toggle = this.menu.ModToggles.get(dep)
				if (toggle !== undefined) {
					toggle.value = true
				}
			}
		}
	}
	private disableMod(mod: string) {
		const handle = this.handles.get(mod)
		if (handle !== undefined) {
			FileSystem.RemoveRedirectList(handle)
			this.handles.delete(mod)
		}
	}
	private updateAll() {
		const enabled = this.menu.State.value
		FileSystem.EnableRedirects(enabled)
		for (const mod of this.modIds) {
			const toggle = this.menu.ModToggles.get(mod)
			if (enabled && toggle?.value) {
				this.enableMod(mod)
			} else {
				this.disableMod(mod)
			}
		}
	}
})()
