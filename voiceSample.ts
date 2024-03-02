import fs from "fs";
import path from "path";
import ttsTikTok, { TTSTikTokVoices } from "./src/tts-tiktok";

const dir = path.join(process.cwd(), "voice-demo");
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

!(async () => {
  for (const v of Object.keys(TTSTikTokVoices)) {
    const buffer = await ttsTikTok("", `this is the ${TTSTikTokVoices[v]} voice`, v);
    if (typeof buffer == "string") console.log(buffer);
    else {
      const file = path.join(dir, `${v}.mp3`);
      fs.writeFileSync(file, buffer);
      console.log(`${file}`);
    }
  }
})().then(() => {
  console.log("Done!");
  process.exit(0);
});
