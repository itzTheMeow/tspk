import fs from "fs";
import path from "path";
import bl from "reblessed";
import { CONFIG_PATH, ConfigJSON, TTSEngines, getConfig, setConfig } from "./config";
import { Speech, playBuffer, speakText } from "./speech";
import { evenTable } from "./utils";

const TextBuffer: string[] = [];
let TextBufferNode: bl.Widgets.BoxElement | null = null;
export function initTextBuffer(node: bl.Widgets.BoxElement) {
  TextBufferNode = node;
}
export function updateTextBuffer() {
  const node = TextBufferNode;
  if (!node) return;
  // if scrolled to bottom or node becomes scrollable
  const shouldScroll = node.getScrollPerc() == 100 || node.getScrollHeight() == node.height,
    // is the scroll height less than the current height (node isnt scrollable yet)
    oldHeightLess = node.getScrollHeight() < Number(node.height);
  node.setContent(TextBuffer.join("\n"));
  if (
    shouldScroll ||
    // before new content, element wasn't scrollable - now it is so we scroll down
    (oldHeightLess && node.getScrollHeight() > Number(node.height))
  )
    node.scrollTo(node.getScrollHeight());
  node.screen.render();
}
export function logText(...text: string[]) {
  TextBuffer.push(...text);
  updateTextBuffer();
}

export function handleText(text: string) {
  if (!text || !TextBufferNode) return;
  const prefix = getConfig().prefix;
  if (text.startsWith(prefix)) {
    const args = text.slice(prefix.length).split(/ +/g),
      command = args[0];
    if (!command) return; // occurs when you just type "/" and hit enter
    if (handleCommand(command, args)) return;
  }

  logText(`> ${text}`);
  if (Speech.isSynthesizing)
    logText("{red-fg}Already synthesizing text. Please try again later.{/}");
  else speakText(text, TextBufferNode.screen);
}

export function handleCommand(command: string, args: string[]): boolean {
  const log: string[] = [`$ ${getConfig().prefix}${command} ${args.slice(1).join(" ")}`.trim()];
  switch (command) {
    case "help": {
      const cmds: [string, string][] = [
        [`help <command>`, `This command! Pass a command to get help for a specific command.`],
        [
          `config <key> <value>`,
          `Get information about the config file. Pass key/value to get/set config options.`,
        ],
        [
          `tts <engines/voices>`,
          `Lists information about the TTS functionality. Optionally use subcommands to list possible engines/voices.`,
        ],
        [`play [file]`, `Plays a sound file (preferrably mp3) using config sound-dir as a base.`],
        [`stop`, `Stop speaking immediately.`],
        [`exit/quit/q`, `Exit the application.`],
      ];
      // sorts out the longest command name for spacing
      log.push(
        `[required] <optional>`,
        // spaces the commands out so all the descriptions are even
        ...evenTable(cmds)
      );
      break;
    }
    case "config": {
      function configKey(key: string) {
        key = key.toLowerCase();
        const val = getConfig()[key];
        return `${key}=${typeof val == "number" ? val : `"${val}"`}`;
      }
      if (args[1]) {
        args[1] = args[1].toLowerCase();
        // first argument is config key
        if (!Object.keys(getConfig()).includes(args[1]))
          log.push("{red-fg}[ERR] Invalid config key.{/}");
        else if (args[2]) {
          // second argument is new value
          // allow "" to set config to empty string
          if (args[2] == '""') args[2] = "";
          const err = setConfig(args[1] as keyof ConfigJSON, args[2]);
          if (err) log.push(`{red-fg}[ERR] ${err}{/}`);
          else log.push(`{green-fg}${configKey(args[1])}{/}`);
        } else {
          // log key value if no new value provided
          log.push(configKey(args[1]));
        }
      } else {
        // no argument provided
        log.push(`Path: ${CONFIG_PATH}`, ...Object.keys(getConfig()).sort().map(configKey));
      }
      break;
    }
    case "tts": {
      switch (args[1]) {
        case "engines": {
          log.push(`Available Voice Engines: ${TTSEngines.join(", ")}`);
          break;
        }
        case "voices": {
          log.push(
            ...evenTable(
              Object.entries(Speech.getVoiceMap())
                .sort((a, b) => {
                  // bump any english voices to the top
                  const aBump = a[0].startsWith("en");
                  const bBump = b[0].startsWith("en");
                  if (aBump && !bBump) return -1;
                  else if (!aBump && bBump) return 1;
                  // alphabetize
                  else return a[0].localeCompare(b[0]);
                })
                .map(([code, name]) => [name, code])
            )
          );
          break;
        }
        default: {
          const voice = getConfig().voice;
          log.push(
            `Engine: ${getConfig()["tts-engine"]}`,
            `Voice: ${Speech.getVoiceMap()[voice]} (${voice})`
          );
        }
      }
      break;
    }
    case "play": {
      const file = path.join(getConfig()["sound-dir"], args.slice(1).join(" "));
      if (!fs.existsSync(file)) log.push(`{red-fg}[ERR] File not found: ${file}{/}`);
      else {
        log.push(`Playing ${path.basename(file)}`);
        playBuffer(fs.readFileSync(file));
      }
      break;
    }
    case "stop": {
      if (Speech.isSpeaking) {
        Speech.isSpeaking();
        log.push("Stopped speaking.");
      } else {
        log.push("{red-fg}Not currently speaking.{/}");
      }
      break;
    }
    case "exit":
    case "quit":
    case "q": {
      process.exit(0);
    }
    default: {
      // returns if invalid command and prefix exists
      // this allows you to set an empty prefix and not get blocked out of TTS
      if (!getConfig().prefix) return false;
      log.push("{red-fg}[ERR] Invalid command.{/}");
    }
  }
  logText(...log);
  return true;
}
