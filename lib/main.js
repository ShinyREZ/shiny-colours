const { BrowserWindow, app, Menu, ipcMain, protocol } = require("electron");
const { resolve, join } = require("path");
const { readFileSync } = require("fs");

function loadConfig(path) {
  return readFileSync(path, { encoding: "utf-8" });
}

const config = JSON.parse(
  loadConfig(resolve((app.getAppPath(), "..", "config.json")))
);

// main window
let mainWindow;

// sandbox
app.enableSandbox();
app.allowRendererProcessReuse = true;

if (!!config.switch && Array.isArray(config.switch)) {
  for (const s of config.switch) {
    app.commandLine.appendSwitch(s);
  }
}

if (!!config.single_instance) {
  app.requestSingleInstanceLock();
}

if (!config.debug) {
  Menu.setApplicationMenu(null);
}

app.on("ready", function createWindow() {
  protocol.registerFileProtocol(
    "shinycolors",
    (request) => {
      let url = request.url.substr("shinycolors://".length);
      if (url.startsWith("sc-host-prefix?")) {
        url = url.substr("sc-host-prefix?".length);
        mainWindow.loadURL(url);
      }
    },
    (err) => {
      if (err) console.error("Failed to register protocol");
    }
  );

  mainWindow = new BrowserWindow({
    width: 1280 - 4,
    height: 720,
    autoHideMenuBar: true,
    resizable: false,
    icon: join(app.getAppPath(), "build", "icon.png"),
    webPreferences: {
      preload: join(app.getAppPath(), "lib", "preload.js"),
    },
  });

  let userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36";
  if (
    !!config.native &&
    typeof config.native === "object" &&
    !!config.native.enable
  ) {
    userAgent +=
      " ENZA_NATIVE_com.bandainamcoent.shinycolors_Android 1.0.26/(126)";
  }
  mainWindow.webContents.userAgent = userAgent;

  mainWindow.loadURL("https://shinycolors.enza.fun");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  ipcMain.on("get-config", (event) => {
    event.returnValue = config;
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow == null) {
    createWindow();
  }
});
