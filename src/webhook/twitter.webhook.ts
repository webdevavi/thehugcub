import addDays from "date-fns/addDays"
import formatDistanceToNowStrict from "date-fns/formatDistanceToNowStrict"
import { Router } from "express"
import { decode } from "html-entities"
import { Types } from "mongoose"
import { client } from "../client"
import { RECEIVE_LIMIT, SEND_LIMIT } from "../constants"
import { MessageModel } from "../entities"
import { hugTemplateRegex, songTemplateRegex } from "../regex"
import { TwitterService } from "../services"
import { getMediaId } from "../util"

export const twitterWebhookRouter = Router()

twitterWebhookRouter.post("/", async (req, res) => {
  const { body } = req

  if ("direct_message_events" in body) {
    const [event] = body.direct_message_events

    console.log(JSON.stringify(event, null, 2))

    if (event.type === "message_create") {
      const {
        message_data: { text, entities, attachment },
        sender_id,
      } = event.message_create

      const messagesSentByThisUser = await MessageModel.find({
        sender_id,
        _id: {
          $gt: Types.ObjectId.createFromTime(Date.now() / 1000 - 24 * 60 * 60),
        },
      })
        .sort({ createdAt: "desc" })
        .limit(SEND_LIMIT)

      console.log(JSON.stringify(messagesSentByThisUser, null, 2))

      if (messagesSentByThisUser.length >= SEND_LIMIT) {
        const timeToWait = formatDistanceToNowStrict(addDays(new Date(messagesSentByThisUser[messagesSentByThisUser.length - 1]!.createdAt), 1))

        await client.directMessages.eventsNew({ event: { type: "message_create", message_create: { message_data: { text: `You can't send more than ${SEND_LIMIT} hugs in 24 hours. Please wait ${timeToWait}.` }, target: { recipient_id: sender_id } } } })
        return res.end()
      }

      try {
        const template = String(text).match(hugTemplateRegex)?.[0]

        if (!template) {
          await client.directMessages.eventsNew({ event: { type: "message_create", message_create: { message_data: { text: "Please use the correct template specified in the pinned tweet." }, target: { recipient_id: sender_id } } } })
          return res.end()
        }

        const receiver_id = entities.user_mentions.find(({ screen_name }: { screen_name: string }) => template.includes(screen_name))?.id_str

        if (!receiver_id) {
          await client.directMessages.eventsNew({ event: { type: "message_create", message_create: { message_data: { text: "The person you tagged does not seem to exist." }, target: { recipient_id: sender_id } } } })
          return res.end()
        }

        const messagesReceivedByThisUser = await MessageModel.find({
          receiver_id,
          _id: {
            $gt: Types.ObjectId.createFromTime(Date.now() / 1000 - 24 * 60 * 60),
          },
        })
          .sort({ createdAt: "desc" })
          .limit(RECEIVE_LIMIT)

        console.log(JSON.stringify(messagesReceivedByThisUser, null, 2))

        if (messagesReceivedByThisUser.length >= RECEIVE_LIMIT) {
          const timeToWait = formatDistanceToNowStrict(addDays(new Date(messagesReceivedByThisUser[messagesReceivedByThisUser.length - 1]!.createdAt), 1))

          await client.directMessages.eventsNew({ event: { type: "message_create", message_create: { message_data: { text: `This user can't receive more than ${RECEIVE_LIMIT} hugs in 24 hours. Please wait ${timeToWait}.` }, target: { recipient_id: sender_id } } } })
          return res.end()
        }

        const twitter = new TwitterService()

        let message = String(text)

        message = message.replace(template, "")

        const songTemplate = String(text).match(songTemplateRegex)?.[0]

        if (songTemplate) {
          message = message.replace(songTemplate, "")

          entities.urls?.forEach(({ url }: { url: string }) => {
            message = message.replace(url, "")
          })

          const songUrl = entities.urls?.find(({ url }: { url: string }) => songTemplate.includes(url))?.url

          message = message.trim() ? `${template}\n\nSpecial song for you - ${songUrl}\n\n💌 - "${decode(message, { level: "html5" }).trim()}"` : `${template}\n\nSpecial song for you - ${songUrl}`
        } else {
          entities.urls?.forEach(({ url }: { url: string }) => {
            message = message.replace(url, "")
          })
          message = message.trim() ? `${template}\n\n💌 - "${decode(message, { level: "html5" }).trim()}"` : template
        }

        const media_id = await getMediaId(attachment, sender_id)

        await twitter.createHugTweet({ text: message, media_id, sender_id, receiver_id })
      } catch (err) {
        await client.directMessages.eventsNew({ event: { type: "message_create", message_create: { message_data: { text: "Could not send the tweet, please try again later." }, target: { recipient_id: sender_id } } } })

        console.log(err)
      }
    }
  }

  return res.end()
})

twitterWebhookRouter.get("/", (req, res) => {
  const { crc_token } = req.query as { crc_token: string }

  console.log("Twitter sent CRC:", crc_token)

  if (!crc_token) return res.end()

  const twitter = new TwitterService()

  const responseToken = twitter.createChallengeResponse(crc_token)

  const response = {
    response_token: responseToken,
  }

  return res.status(200).json(response)
})
