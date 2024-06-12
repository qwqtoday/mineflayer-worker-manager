export type Message = EventMessage

export interface EventMessage {
    type: "event"
    eventName: string
    value: any
}

