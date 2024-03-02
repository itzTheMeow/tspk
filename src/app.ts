import bl from "reblessed";
import mainWindow from "./mainWindow";
import { logText } from "./textHandler";
import topBar from "./topBar";

process.on("unhandledRejection", (err) => {
  console.clear();
  console.log(err);
  process.exit(0);
});

const screen = bl.screen({
  smartCSR: true,
  title: "Tspk",
  width: "100%",
  height: "100%",
  fullUnicode: true,
  ignoreLocked: ["C-c", "C-w"],
});

screen.enableMouse();

topBar(screen);
mainWindow(screen);

screen.key(["C-c", "C-w"], function (ch, key) {
  return process.exit(0);
});

screen.render();

logText("Welcome to Tspk!");
