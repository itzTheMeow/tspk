import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import bl from "reblessed";
import { TTSEngine, TTSEngines, getConfig } from "./config";
import { logText } from "./textHandler";
import ttsTiktok, { TTSTikTokVoices } from "./tts-tiktok";

export let Speech: {
  /** Remaining buffers to speak. */
  toSpeak: Buffer[];
  /** Callback function to stop speaking if currently speaking. Otherwise false. */
  isSpeaking: (() => any) | false;
  /** If speech is currently being synthesized. */
  isSynthesizing: boolean;
  /** Gets the voice map for selected voice engine. */
  getVoiceMap(): Record<string, string>;
} = {
  toSpeak: [],
  isSpeaking: false,
  isSynthesizing: false,
  getVoiceMap() {
    switch (getConfig()["tts-engine"] as TTSEngine) {
      case "tiktok":
        return TTSTikTokVoices;
    }
  },
};

async function speakTextLinux(buffer: Buffer) {
  // parameters for virtual mic creation (maybe let these be configured?)
  const VIRTUAL_MIC = "/tmp/virtual-mic",
    V_FORMAT = "s16le",
    V_RATE = "16000",
    V_CHANNELS = "1";
  // if we are already speaking then add this buffer to the backlog
  if (Speech.isSpeaking) return Speech.toSpeak.push(buffer);
  // when this is called, it will stop speaking and clear the backlog buffer
  Speech.isSpeaking = () => {
    Speech.toSpeak.splice(0);
    streamer.kill("SIGKILL");
    writer.destroy();
    Speech.isSpeaking = false;
  };
  // create a virtual mic if it doesnt exist
  if (!fs.existsSync(VIRTUAL_MIC))
    execSync(
      `pactl load-module module-pipe-source source_name=${path.basename(
        VIRTUAL_MIC
      )} file=${VIRTUAL_MIC} format=${V_FORMAT} rate=${V_RATE} channels=${V_CHANNELS}`
    );

  // to output to the mic we have to write to the virtual mic file
  const writer = fs.createWriteStream(VIRTUAL_MIC);
  const streamer = spawn("ffmpeg", [
    "-re", // read in real-time
    "-i", // input from stdin
    "pipe:0",
    "-f", // output to alsa default device (speaker)
    "alsa",
    "default",
    "-f", // format to virtual mic params
    V_FORMAT,
    "-ar",
    V_RATE,
    "-ac",
    V_CHANNELS,
    "-", // stdout
  ]);
  streamer.stdout.pipe(writer); // output of ffmpeg goes to virtual mic
  streamer.stdin.end(buffer); // write generated audio to ffmpeg stdin

  // copy ffmepg logs
  //streamer.stderr.on("data", (c) => logText(c.toString()));
  streamer.on("close", () => {
    // kill processes
    streamer.kill("SIGKILL");
    writer.destroy();
    Speech.isSpeaking = false;
    // process next speech buffer if exists
    if (Speech.toSpeak.length) return speakTextLinux(Speech.toSpeak.shift()!);
  });
}

export async function speakText(text: string, screen: bl.Widgets.Screen) {
  Speech.isSynthesizing = true;
  const synthIndicator = bl.loading({
    parent: screen,
    top: 1,
    right: 0,
    bg: "red",
    fg: "white",
    width: 1,
    height: 1,
  });
  synthIndicator._.icon.top = synthIndicator._.icon.left = 0;
  synthIndicator.load("");
  screen.lockKeys = false;
  let buffer: Buffer | null = null;
  switch (getConfig()["tts-engine"] as (typeof TTSEngines)[number]) {
    case "tiktok": {
      const token = getConfig()["tts-token"];
      if (!token) logText("{red-fg}[ERR] No TikTok session token provided.{/}");
      else {
        const res = await ttsTiktok(token, text, getConfig().voice);
        if (typeof res == "string") logText(`{red-fg}[ERR] ${res}{/}`);
        else buffer = res;
      }
      break;
    }
    default:
      logText(`{red-fg}[ERR] Invalid speech engine '${getConfig()["tts-engine"]}'.{/}`);
  }
  synthIndicator.stop();
  screen.remove(synthIndicator);

  if (buffer) {
    playBuffer(buffer);
  } else logText(`{red-fg}[ERR] Unable to synthesize speech.{/}`);
  Speech.isSynthesizing = false;
}

export function playBuffer(buffer: Buffer) {
  if (process.platform == "linux") speakTextLinux(buffer);
  else logText(`{red-fg}[ERR] Unable to play audio on this platform.{/}`);
}
