import { Worker, isMainThread } from "worker_threads"
import { MineflayerBotWorkerOptions, MineflayerBotWorkerState } from "./worker"
import { EventMessage, Message } from "./messages"
import { EventEmitter } from "stream"

export interface MineflayerBotWorkerManagerOptions {
    workerFilePath: string
    restartDelayMS?: number
}

export interface MineflayerBotWorker {
    _worker?: Worker
    options: MineflayerBotWorkerOptions
    state: MineflayerBotWorkerState
}

export class MineflayerBotWorkerManager extends EventEmitter {
    options: MineflayerBotWorkerManagerOptions
    workers: Map<string, MineflayerBotWorker>

    constructor(options: MineflayerBotWorkerManagerOptions) {
        if (!isMainThread)
            throw new Error("Worker manager must be started in main thread.")
        super()
        this.workers = new Map()

        this.options = options
        this.setDefaultOptions()

        this.startHandle()
    }

    setDefaultOptions() {
        this.options.restartDelayMS ??= 5000
    }

    addWorker(options: MineflayerBotWorkerOptions) {
        const worker: MineflayerBotWorker = {
            _worker: new Worker(this.options.workerFilePath, {
                workerData: options,
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
                return
        }
        this.emit(msg.eventName, msg.value)
    }

    postMessageToWorker(workerName: string, message: Message) {
        const worker = this.workers.get(workerName)
        worker._worker.postMessage(message)
    }

    postEventToWorker(workerName: string, eventName: string, value?: any) {
        this.postMessageToWorker(workerName, {
            type: "event",
            eventName: eventName,
            value: value
        } as EventMessage)
    }

    private startHandle() {
        const findAndStartOfflineWorker = () => {
            for (let [key, worker] of this.workers) {
                if (worker.state === "OFFLINE") {
                    this.postEventToWorker(key, "startBot")
                    return
                }
            }
        }
        setInterval(findAndStartOfflineWorker, this.options.restartDelayMS)
    }
}