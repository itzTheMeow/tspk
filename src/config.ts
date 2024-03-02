import fs from "fs";
import path from "path";
import configDefault from "./config_default.json" assert { type: "json" };
import { TTSTikTokVoices } from "./tts-tiktok";

export const CONFIG_DIR = path.join(
    process.env.APPDATA ||
      (process.platform == "darwin"
        ? process.env.HOME + "/Library/Preferences"
        : process.env.HOME + "/.local/share"),
    "ttsboard"
  ),
  CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

export type ConfigJSON = typeof configDefault;

let CONFIG: ConfigJSON | null = null;

export function getConfig(): ConfigJSON {
  if (CONFIG) return CONFIG;

  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR);
  if (!fs.existsSync(CONFIG_PATH)) {
    CONFIG = configDefault;
    saveConfig();
  } else {
    const read = fs.readFileSync(CONFIG_PATH).toString();
    CONFIG = { ...configDefault, ...JSON.parse(read) };
  }
  // CONFIG should always be set here
  return CONFIG || (CONFIG = configDefault);
}
export function setConfig(key: keyof ConfigJSON, value: string): string | null {
  if (!CONFIG) {
    getConfig();
    if (!CONFIG) return "Failed to load config.";
  }
  switch (key) {
    case "prefix": {
      CONFIG.prefix = value;
      break;
    }
    case "sound-dir": {
      const folder = path.resolve(value);
      if (!fs.existsSync(folder)) return `Invalid path: ${folder}`;
      CONFIG["sound-dir"] = folder;
      break;
    }
    case "tts-engine": {
      if (!TTSEngines.includes(<any>value))
        return `Invalid TTS engine. Supported engines can be seen with {bold}${CONFIG.prefix}tts engines{/}.`;
      CONFIG["tts-engine"] = value;
      break;
    }
    case "tts-token": {
      CONFIG["tts-token"] = value;
      break;
    }
    case "voice": {
      switch (CONFIG["tts-engine"] as TTSEngine) {
        case "tiktok":
          if (!Object.keys(TTSTikTokVoices).includes(value))
            return `Invalid voice key. See valid ones with {bold}${CONFIG.prefix}tts voices{/}`;
          break;
      }
      CONFIG.voice = value;
      break;
    }
    default:
      return "Config key not supported yet.";
  }
  saveConfig();
  return null;
}
export function saveConfig() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(CONFIG || configDefault, undefined, 2));
}

export const TTSEngines = ["tiktok"] as const;
export type TTSEngine = (typeof TTSEngines)[number];
