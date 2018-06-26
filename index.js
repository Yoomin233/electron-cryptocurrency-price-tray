const { app, BrowserWindow, ipcMain, Tray } = require("electron");
const path = require("path");

let tray = null;
let window = null;

const assetsDir = path.join(__dirname, "./assets");

// app not in the dock
// app.dock.
app.dock.hide();

app.on("ready", () => {
  createTray();
  createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});

const createTray = () => {
  tray = new Tray(path.join(__dirname, "./assets/btc1.png"));
  // tray.setTitle("hhehda");
  tray.on("right-click", toggleWindow);
  tray.on("double-click", toggleWindow);
  tray.on("click", e => {
    toggleWindow();
    // console.log(process.defaultApp, e.metaKey)
    // window.openDevTools({
    //   mode: "detach"
    // });
    // if (window.isVisible() && process.defaultApp && e.metaKey) {
    // }
  });
};

const createWindow = () => {
  window = new BrowserWindow({
    width: 400,
    // height: 400,
    minHeight: 200,
    maxHeight: 400,
    show: false,
    frame: false,
    fullscreenable: false,
    resizable: false,
    transparent: true,
    webPreferences: {
      // Prevents renderer process code from not running when window is
      // hidden
      backgroundThrottling: false
    }
  });
  window.loadURL(`file://${path.join(__dirname, "index.html")}`);
  // Hide the window when it loses focus
  window.on("focus", () => {
    window.webContents.send("event-window-focus");
  });
  window.on("blur", () => {
    if (!window.webContents.isDevToolsOpened()) {
      window.hide();
    }
    window.webContents.send("event-window-blur");
  });
  window.focus();
};

const toggleWindow = () => {
  if (window.isVisible()) {
    window.hide();
  } else {
    showWindow();
  }
};

const showWindow = () => {
  const position = getWindowPosition();
  window.setPosition(position.x, position.y, false);
  window.show();
  window.focus();
};

const getWindowPosition = () => {
  const windowBounds = window.getBounds();
  const trayBounds = tray.getBounds();
  // console.log(trayBounds)

  // Center window horizontally below the tray icon
  const x = Math.round(
    trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2
  );

  // Position window 4 pixels vertically below the tray icon
  const y = Math.round(trayBounds.y + trayBounds.height + 4);
  //
  return { x: x, y: y };
};

ipcMain.on("show-window", () => {
  showWindow();
});

let ifShowInfo = true;
ipcMain.on("price-update", (e, data) => {
  ifShowInfo &&
    tray.setTitle(`${data.symbolName}:${Number(data.last).toPrecision(4)}`);
});

ipcMain.on("signal-info-show", (e, ifShow) => {
  if (ifShow) {
    ifShowInfo = true;
    tray.setTitle("waiting...");
  } else {
    tray.setTitle("");
    ifShowInfo = false;
  }
});

ipcMain.on("process_exit", e => {
  process.exit();
});
