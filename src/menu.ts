import { Menu } from "github.com/octarine-public/wrapper/index"

interface ModConfig {
	name: string
	description?: string
	defaultState?: boolean
	dependencies?: string[]
}

export class MenuManager {
	public readonly State: Menu.Toggle
	public readonly ModToggles = new Map<string, Menu.Toggle>()

	private readonly basePath = "github.com/octarine-public/dota2-mods"
	private readonly icon = this.basePath + "/scripts_files/icons/box-remove.svg"
	
	private readonly entry = Menu.AddEntry("Changer")
	private readonly menu = this.entry.AddNode("Dota 2 Minify", this.icon)

	constructor(mods: string[], config: Record<string, ModConfig>) {
		this.State = this.menu.AddToggle("State", true, "Disable all mods")
		for (const mod of mods) {
			const name = config[mod]?.name ?? mod
			const tooltip = Menu.Localization.Localize(config[mod]?.description ?? "")
			const defaultState = config[mod]?.defaultState ?? false
			this.ModToggles.set(mod, this.menu.AddToggle(name, defaultState, tooltip))
		}
	}
}
