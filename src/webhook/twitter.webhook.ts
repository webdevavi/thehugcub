import { Router } from "express"
import { TwitterService } from "../services"

export const twitterWebhookRouter = Router()

const FULL_REGEX = /roast\s{1,}@[a-zA-Z0-9_]*/gi

const REGEX = /@[a-zA-Z0-9_]*/i

twitterWebhookRouter.post("/", async (req, res) => {
  const { body } = req

  const [event] = body.tweet_create_events

  if ("tweet_create_events" in body && !body.user_has_blocked && event.user.id_str !== body.for_user_id) {
    if (FULL_REGEX.test(String(event.text))) {
      const twitter = new TwitterService()

      const [text] = Array.from(String(event.text).match(FULL_REGEX)!)

      const [match] = Array.from(text!.match(REGEX)!)

      const screenName = match!.replace("@", "")

      await twitter.replyWithRoast(
        event.id_str,
        [event.user.screen_name, ...(event.entities.user_mentions?.filter(({ id_str }: { id_str: string }) => id_str !== "1443918489987600385").map(({ screen_name }: { screen_name: string }) => screen_name) ?? [])],
        event.entities.user_mentions?.find(({ screen_name }: { screen_name: string }) => new RegExp(`^${screenName}$`, "i").test(screen_name))?.name?.split(" ")?.[0]
      )
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
