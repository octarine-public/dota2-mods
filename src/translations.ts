import { Menu, Utils } from "github.com/octarine-public/wrapper/index"

const Load = (name: string) => new Map<string, string>(Object.entries(Utils.readJSON(`translations/${name}.json`)))

Menu.Localization.AddLocalizationUnit("russian", Load("ru"))
Menu.Localization.AddLocalizationUnit("english", Load("en"))
Menu.Localization.AddLocalizationUnit("chinese", Load("cn"))
