import bl from "reblessed";

export default function topBar(screen: bl.Widgets.Screen) {
  const topBar = bl.box({
    bg: "white",
    fg: "black",
    content: "TTSBoard",
    height: 1,
    padding: { left: 1, right: 1 },
  });

  const exit = bl.button({
    content: "Exit",
    width: "shrink",
    fg: "white",
    left: topBar.content.length + 1,
    padding: { left: 1, right: 1 },
    mouse: true,
    style: {
      focus: {
        bg: "blue",
        fg: "black",
      },
      hover: {
        bg: "blue",
        fg: "black",
      },
    },
  });
  exit.on("press", () => {
    process.exit(0);
  });
  topBar.append(exit);

  screen.append(topBar);
}
