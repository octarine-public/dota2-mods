const fs = require("fs");
const path = require("path");

const MINIFY_MODS_DIR = "..\\mods";
const OUTPUT_MODS_DIR = path.resolve(__dirname, "../scripts_files/mods");
const BLANKS_DIR = "blanks";

const SUPPORTED_BLANK_EXTENSIONS = new Set([
    ".vmat_c", ".vmdl_c", ".vpcf_c", ".vtex_c", ".vsnd_c", ".txt",
]);

const PORTABLE_MODS = {
    "Remove Foilage": {
        id: "foilage",
        name: "Remove Foilage",
    },
    "Dark Terrain": {
        id: "dark_terrain",
        name: "Dark Terrain",
        dependencies: ["foilage"],
    },
    "Mute Ambient Sounds": {
        id: "mute_ambient_sounds",
        name: "Mute Ambient Sounds",
    },
    "Minify Base Attacks": {
        id: "minify_base_attacks",
        name: "Minify Base Attacks",
    },
    "Minify Spells & Items": {
        id: "minify_spells_items",
        name: "Minify Spells & Items",
    },
    "Misc Optimization": {
        id: "misc_optimization",
        name: "Misc Optimization",
    },
    "Remove Weather Effects": {
        id: "remove_weather_effects",
        name: "Remove Weather Effects",
    },
    "Remove River": {
        id: "remove_river",
        name: "Remove River",
    },
    "Remove Sprays": {
        id: "remove_sprays",
        name: "Remove Sprays",
    },
    "Remove Pings": {
        id: "remove_pings",
        name: "Remove Pings",
    },
    "Mute Default Announcer": {
        id: "mute_default_announcer",
        name: "Mute Default Announcer",
    },
    "Mute Taunt Sounds": {
        id: "mute_taunt_sounds",
        name: "Mute Taunt Sounds",
    },
    "Mute Voice Line Sounds": {
        id: "mute_voice_line_sounds",
        name: "Mute Voice Line Sounds",
    },
};

function copyDirRecursive(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function getBlankFile(filePath) {
    const ext = path.extname(filePath);
    if (SUPPORTED_BLANK_EXTENSIONS.has(ext)) {
        return `${BLANKS_DIR}/blank${ext}`;
    }
    return null;
}

function parseBlacklist(blacklistPath, gamePakContents) {
    if (!fs.existsSync(blacklistPath)) return { entries: {}, skipped: [] };

    const content = fs.readFileSync(blacklistPath, "utf-8");
    const lines = content.split(/\r?\n/);
    const entries = {};
    const exclusions = [];
    const skipped = [];

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;

        if (line.startsWith(">>")) {
            const dir = line.slice(2).trim() + "/";
            const matches = gamePakContents.filter(f => f.startsWith(dir));
            for (const match of matches) {
                const blank = getBlankFile(match);
                if (blank) {
                    entries[match] = blank;
                }
            }
            if (matches.length === 0) {
                skipped.push(line);
            }
        } else if (line.startsWith("**")) {
            const pattern = line.slice(2).trim();
            // convert glob pattern to regex: * -> .*, . -> \.
            let regexPattern = pattern
                .replace(/\.\*/g, "__WILDCARD__")  // .* -> __WILDCARD__
                .replace(/\*/g, ".*")              // * -> .*
                .replace(/\\\.(\w+)$/g, "$1")       // \.ext -> ext (for file extensions)
                .replace(/\./g, "\\.")             // . -> \.
                .replace(/__WILDCARD__/g, ".*");   // __WILDCARD__ -> .*
            const regex = new RegExp(regexPattern);
            const matches = gamePakContents.filter(f => regex.test(f));
            for (const match of matches) {
                const blank = getBlankFile(match);
                if (blank) {
                    entries[match] = blank;
                }
            }
            if (matches.length === 0) {
                skipped.push(line);
            }
        } else if (line.startsWith("*-")) {
            const pattern = line.slice(2).trim();
            let regexPattern = pattern
                .replace(/\.\*/g, "__WILDCARD__")
                .replace(/\*/g, ".*")
                .replace(/\\\.(\w+)$/g, "$1")
                .replace(/\./g, "\\.")
                .replace(/__WILDCARD__/g, ".*");
            const regex = new RegExp(regexPattern);
            const matches = gamePakContents.filter(f => regex.test(f));
            for (const match of matches) {
                exclusions.push(match);
            }
            if (matches.length === 0) {
                skipped.push(line);
            }
        } else if (line.startsWith("--")) {
            exclusions.push(line.slice(2));
        } else {
            const blank = getBlankFile(line);
            if (blank) {
                entries[line] = blank;
            }
        }
    }

    for (const ex of exclusions) {
        delete entries[ex];
    }

    return { entries, skipped };
}

function scanFilesRecursive(dirPath, basePath, modId) {
    const entries = {};
    if (!fs.existsSync(dirPath)) return entries;

    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        if (item.isDirectory()) {
            Object.assign(entries, scanFilesRecursive(fullPath, basePath, modId));
        } else if (item.name !== "entry-point.json") {
            const relPath = path.relative(basePath, fullPath).replace(/\\/g, "/");
            entries[relPath] = `mods/${modId}/${relPath}`;
        }
    }
    return entries;
}

function run() {
    if (!fs.existsSync(MINIFY_MODS_DIR)) {
        console.error(`dota2-minify mods not found: ${MINIFY_MODS_DIR}`);
        process.exit(1);
    }

    const gamePakContentsPath = path.resolve(__dirname, "../gamepakcontents.txt");
    if (!fs.existsSync(gamePakContentsPath)) {
        console.error(`gamepakcontents.txt not found: ${gamePakContentsPath}`);
        console.error(`Run: Source2Viewer-CLI.exe -i "path/to/pak01_dir.vpk" --vpk_list > gamepakcontents.txt`);
        process.exit(1);
    }

    const gamePakContents = fs.readFileSync(gamePakContentsPath, "utf16le")
        .split(/\r?\n/)
        .map(line => line.split(/\s+/)[0])
        .filter(line => line && line.includes("/"));

    const config = {};
    const modIds = [];

    for (const [minifyName, modDef] of Object.entries(PORTABLE_MODS)) {
        const { id, name, dependencies } = modDef;
        const srcModDir = path.join(MINIFY_MODS_DIR, minifyName);
        const destModDir = path.join(OUTPUT_MODS_DIR, id);

        if (!fs.existsSync(srcModDir)) {
            console.log(`[SKIP] ${minifyName}: not found in dota2-minify`);
            continue;
        }

        fs.mkdirSync(destModDir, { recursive: true });

        const srcFilesDir = path.join(srcModDir, "files");
        let filesCopied = 0;
        if (fs.existsSync(srcFilesDir)) {
            const items = fs.readdirSync(srcFilesDir, { withFileTypes: true });
            for (const item of items) {
                const src = path.join(srcFilesDir, item.name);
                const dest = path.join(destModDir, item.name);
                if (item.isDirectory()) {
                    copyDirRecursive(src, dest);
                } else if (item.name !== ".gitkeep") {
                    fs.mkdirSync(path.dirname(dest), { recursive: true });
                    fs.copyFileSync(src, dest);
                }
            }
            filesCopied = Object.keys(scanFilesRecursive(destModDir, destModDir, id)).length;
        }

        const blacklistPath = path.join(srcModDir, "blacklist.txt");
        const { entries: blacklistEntries, skipped } = parseBlacklist(blacklistPath, gamePakContents, minifyName);

        const fileEntries = scanFilesRecursive(destModDir, destModDir, id);

        const merged = { ...blacklistEntries, ...fileEntries };

        if (Object.keys(merged).length === 0) {
            if (skipped.length > 0) {
                console.log(`[WARN] ${minifyName} -> ${id}: all ${skipped.length} entries are patterns (need gamepakcontents.txt)`);
            } else {
                console.log(`[SKIP] ${minifyName} -> ${id}: no entries`);
            }
            continue;
        }

        fs.writeFileSync(
            path.join(destModDir, "entry-point.json"),
            JSON.stringify(merged, null, 4),
            "utf-8"
        );

        const modConfig = { name };
        if (dependencies && dependencies.length > 0) {
            modConfig.dependencies = dependencies;
        }
        config[id] = modConfig;
        modIds.push(id);

        const blCount = Object.keys(blacklistEntries).length;
        const fCount = Object.keys(fileEntries).length;
        console.log(`[OK] ${minifyName} -> ${id}: ${Object.keys(merged).length} total (${blCount} blanks, ${fCount} files)`);

        if (skipped.length > 0) {
            console.log(`       ${skipped.length} pattern(s) skipped`);
        }
    }

    fs.writeFileSync(
        path.join(OUTPUT_MODS_DIR, "config.json"),
        JSON.stringify(config, null, 4),
        "utf-8"
    );

    fs.writeFileSync(
        path.join(OUTPUT_MODS_DIR, "index.json"),
        JSON.stringify(modIds, null, 4),
        "utf-8"
    );

    console.log(`\nDone: ${modIds.length} mods ported`);
    console.log(`Config: ${path.join(OUTPUT_MODS_DIR, "config.json")}`);
    console.log(`Index: ${path.join(OUTPUT_MODS_DIR, "index.json")}`);
}

run()
