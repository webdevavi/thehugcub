import { model, Schema } from "mongoose"

export interface IMessage {
  sender_id: string
  receiver_id: string
  is_anonymous: boolean
  text: string
  media_id?: string
}

export class Message implements IMessage {
  sender_id!: string

  receiver_id!: string

  is_anonymous!: boolean

  text!: string

  media_id?: string
}

export const MessageSchema = new Schema(
  {
    sender_id: { type: String, required: true },
    receiver_id: { type: String, required: true },
    is_anonymous: { type: Boolean, required: true },
    text: { type: String, required: true },
    media_id: { type: String, required: false },
  },
  { timestamps: true }
)

export const MessageModel = model<Message>("Message", MessageSchema)
