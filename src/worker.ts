import  { isMainThread, workerData, parentPort } from "worker_threads"
import { Bot, createBot } from "mineflayer"
import { EventMessage } from "./messages"


export type MineflayerBotWorkerState = "ONLINE" | "OFFLINE"

export interface MineflayerBotWorkerOptions {
    host: string
    port: number

    name: string
    auth: 'mojang' | 'microsoft' | 'offline'
    viewDistance: number
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
    }

    protected updateState(newState: MineflayerBotWorkerState) {
        parentPort.postMessage({
            type: "event",
            eventName: "updateState",
            value: newState as MineflayerBotWorkerState
        } as EventMessage)
    }

    protected startBot() {
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
}