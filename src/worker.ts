import  { isMainThread, workerData, parentPort } from "worker_threads"
import { Bot, createBot } from "mineflayer"
import { EventMessage, Message } from "./messages"


export type MineflayerBotWorkerState = "ONLINE" | "OFFLINE" | "STOPPED"

export interface MineflayerBotWorkerOptions {
    host?: string
    port?: number

    name: string
    auth?: 'mojang' | 'microsoft' | 'offline'
    viewDistance?: number
}

export type BotInitFunc = (bot: Bot) => void

export class MineflayerBotWorkerThread {
    options: MineflayerBotWorkerOptions
    _bot: Bot

    initBot: BotInitFunc

    constructor(initBot: BotInitFunc) {
        if (isMainThread)
            throw new Error("this is main thread")

        this.initBot = initBot
        this.options = workerData
        this.setDefaultOptions()

        parentPort.on("message", this.handleMessage)
    }

    handleEventMessage(msg: EventMessage) {
        switch (msg.eventName) {
            case "startBot":
                this.startBot()
                return;
        }
    }
    
    handleMessage(msg: Message) {
        switch (msg.type) {
            case "event":
                this.handleEventMessage(msg)
                return
        }
    }

    
    
    setDefaultOptions() {
        this.options.host ??= "localhost"
        this.options.port ??= 25565
        this.options.viewDistance ??= 10
        this.options.auth ??= "microsoft"
    }

    updateState(newState: MineflayerBotWorkerState) {
        this.postEventToMainThread("updateState", newState)
    }

    startBot() {
        this._bot = createBot({
            host: this.options.host,
            port: this.options.port,
            username: this.options.name,
            auth: this.options.auth,
            viewDistance: this.options.viewDistance
        })

        this._bot.once("end", (reason) => {
            this.updateState("OFFLINE")
        })
        
        this._bot.once("spawn", () => {
            this.updateState("ONLINE")
            this.initBot(this._bot)
        })
    }

    postEventToMainThread(eventName: string, value: any) {
        parentPort.postMessage({
            type: "event",
            eventName: eventName,
            value: value
        } as EventMessage)
    }
}