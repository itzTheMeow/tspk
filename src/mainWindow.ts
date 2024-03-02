import bl from "reblessed";
import { getConfig } from "./config";
import { Speech } from "./speech";
import { handleText, initTextBuffer } from "./textHandler";

const TEXTBOX_HISTORY: string[] = [];
let TEXTBOX_HISTORY_INDEX = -1;

export default function mainWindow(screen: bl.Widgets.Screen) {
  const feedback = bl.scrollablebox({
    parent: screen,
    top: 1,
    bottom: 1,
    fg: "white",
    scrollable: true,
    mouse: true,
    tags: true,
  });
  initTextBuffer(feedback);

  const textbox = bl.textbox({
    parent: screen,
    width: "100%",
    height: 1,
    bottom: 0,
    bg: "black",
    fg: "white",
    mouse: true,
    input: true,
    inputOnFocus: true,
  });
  // textbox history buffer, allows up/down keys to see history
  textbox.key("up", () => {
    // current in history
    if (TEXTBOX_HISTORY_INDEX == -1) {
      const text = textbox.getValue();
      TEXTBOX_HISTORY_INDEX = TEXTBOX_HISTORY.length - 1;
      textbox.setValue(TEXTBOX_HISTORY[TEXTBOX_HISTORY_INDEX]);
      if (text) TEXTBOX_HISTORY.push(text);
      screen.render();
    } else {
      TEXTBOX_HISTORY_INDEX--;
      if (TEXTBOX_HISTORY_INDEX < 0) TEXTBOX_HISTORY_INDEX = 0;
      const historyItem = TEXTBOX_HISTORY[TEXTBOX_HISTORY_INDEX];
      textbox.setValue(historyItem);
      screen.render();
    }
  });
  textbox.key("down", () => {
    // stop at bottom or if there is no history index
    if (TEXTBOX_HISTORY_INDEX !== -1 && TEXTBOX_HISTORY_INDEX < TEXTBOX_HISTORY.length - 1) {
      TEXTBOX_HISTORY_INDEX++;
      if (TEXTBOX_HISTORY_INDEX >= TEXTBOX_HISTORY.length)
        TEXTBOX_HISTORY_INDEX = TEXTBOX_HISTORY.length - 1;
      const historyItem = TEXTBOX_HISTORY[TEXTBOX_HISTORY_INDEX];
      textbox.setValue(historyItem);
      screen.render();
      // reset if we hit the bottom
      if (TEXTBOX_HISTORY_INDEX == TEXTBOX_HISTORY.length - 1) TEXTBOX_HISTORY_INDEX = -1;
    }
  });
  textbox.key(["C-c", "C-w"], () => process.exit(0));
  textbox.key("escape", () => {
    feedback.scrollTo(feedback.getScrollHeight());
    screen.render();
    textbox.readInput();
  });
  textbox.key("tab", () => {
    const text = textbox.getValue();
    if (!text.startsWith(getConfig().prefix)) return;
    const args = textbox.getValue().slice(getConfig().prefix.length).split(/ +/g),
      command = args[0];
    function tabcomplete(base: string, possibilities: string[]): string {
      //TODO:
      return base;
    }
    switch (command) {
      case "config":
        switch (args[1]) {
          case "voice":
            if (args[2]) {
              tabcomplete(args[2], Object.keys(Speech.getVoiceMap()));
            }
            break;
        }
        break;
    }
  });
  textbox.on("submit", () => {
    const text = textbox.getValue();
    if (!text) return;
    handleText(text);
    TEXTBOX_HISTORY.push(text);
    TEXTBOX_HISTORY_INDEX = -1;

    textbox.clearValue();
    screen.render();
    textbox.readInput();
  });
  textbox.focus();

  const textLength = bl.box({
    parent: screen,
    width: "shrink",
    bottom: 0,
    right: 0,
    content: "0",
  });
  textbox.on("input", () => {
    textLength.setContent(textbox.getValue().length.toLocaleString());
    textLength.render();
  });
}
