'use strict'

const { init } = require('@sentry/electron/main');

init({
    debug: true,
    dsn: process.env.VUE_APP_SENTRY_DSN
});


import { app, protocol, ipcMain, BrowserWindow } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
import clickupService from '@/clickup-service'
import { createMenu } from '@/app-menu'
import updater from '@/app-updater'
import path from 'path';

const isDevelopment = process.env.NODE_ENV !== 'production'

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { secure: true, standard: true } }
])


// Fetch ClickUp hierarchy when the app starts up
ipcMain.on('get-clickup-hierarchy', (event) => {
    clickupService.getCachedHierarchy()
        .then(hierarchy => event.reply('set-clickup-hierarchy', hierarchy))
        .catch(err => event.reply('fetch-clickup-hierarchy-error', err))
})

// Clear ClickUp hierarchy cache & fetch fresh hierarchy
ipcMain.on('refresh-clickup-hierarchy', (event) => {
    clickupService.clearCachedHierarchy()
    clickupService.getHierarchy()
        .then(hierarchy => event.reply('set-clickup-hierarchy', hierarchy))
        .catch(err => event.reply('fetch-clickup-hierarchy-error', err))
})

//Fetch color palette from ClickUp
ipcMain.on('get-clickup-colors', (event) => {
    clickupService.getColorsBySpace()
        .then(colors => event.reply('set-clickup-colors', colors))
        .catch(err => event.reply('fetch-clickup-colors-error', err))
})

async function createWindow() {
    // Create the browser window.
    const win = new BrowserWindow({
        width: 1200,
        height: 720,
        titleBarStyle: 'hidden',
        webPreferences: {
            // Use pluginOptions.nodeIntegration, leave this alone
            // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
            nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
            contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,

            // Inject preload script for Sentry support
            preload: path.join(__dirname, 'preload.js')
        }
    })

    win.maximize();

    if (process.env.WEBPACK_DEV_SERVER_URL) {
        // Load the url of the dev server if in development mode

        try {
            await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL).then(() => {
                // if (!process.env.IS_TEST) win.webContents.openDevTools({ mode: 'bottom' })
            })
        } catch (e) {
            console.error('Vue Devtools failed to install:', e.toString())
        }
    } else {
        createProtocol('app')
        // Load the index.html when not in development
        win.loadURL('app://./index.html')

        updater.checkForUpdatesAndNotify()
    }
}


// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
    if (isDevelopment && !process.env.IS_TEST) {
        // Install Vue Devtools
        try {
            await installExtension(VUEJS3_DEVTOOLS)
        } catch (e) {
            console.error('Vue Devtools failed to install:', e.toString())
        }
    }
    createWindow()
    createMenu()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
    if (process.platform === 'win32') {
        process.on('message', (data) => {
            if (data === 'graceful-exit') {
                app.quit()
            }
        })
    } else {
        process.on('SIGTERM', () => {
            app.quit()
        })
    }
}
