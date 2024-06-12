import { Worker, isMainThread } from "worker_threads"
import { MineflayerBotWorkerOptions, MineflayerBotWorkerState } from "./worker"
import { EventMessage, Message } from "./messages"

export interface MineflayerBotWorkerManagerOptions {
    workerFilePath: string

}

export interface MineflayerBotWorker {
    _worker?: Worker
    options: MineflayerBotWorkerOptions
    state: MineflayerBotWorkerState
}

export class MineflayerBotWorkerManager {
    options: MineflayerBotWorkerManagerOptions
    workers: Map<string, MineflayerBotWorker>

    constructor(options: MineflayerBotWorkerManagerOptions) {
        if (!isMainThread)
            throw new Error("Worker manager must be started in main thread.")

        this.options = options
        this.workers = new Map()
    }

    addWorker(options: MineflayerBotWorkerOptions) {
        const worker: MineflayerBotWorker = {
            _worker: new Worker(this.options.workerFilePath, {
                workerData: options
            }),
            options: options,
            state: "OFFLINE"
        }

        const handleMessage = (msg: Message) => {
            switch (msg.type) {
                case "event":
                    this.handleWorkerEventMessage(worker, msg)
                    break
            }
        }

        worker._worker.on("message", handleMessage)

        this.workers.set(worker.options.name, worker)
    }

    handleWorkerEventMessage(worker: MineflayerBotWorker, msg: EventMessage) {
        switch (msg.eventName) {
            case "updateState":
                worker.state = msg.value
                break;
        }
    }
}