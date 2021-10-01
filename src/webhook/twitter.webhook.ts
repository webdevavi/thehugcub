import { Router } from "express"
import { TwitterService } from "../services"

export const twitterWebhookRouter = Router()

twitterWebhookRouter.post("/", async (req, res) => {
  const { body } = req

  if ("tweet_create_events" in body && !body.user_has_blocked && body.tweet_create_events[0].user.id_str !== body.for_user_id) {
    if (/roast/i.test(String(body.tweet_create_events[0].text))) {
      const twitter = new TwitterService()

      await twitter.replyWithRoast(
        body.tweet_create_events[0].id_str,
        body.tweet_create_events[0].entities.user_mentions?.map(({ screen_name }: { screen_name: string }) => screen_name),
        body.tweet_create_events[0].entities.user_mentions?.filter(({ id_str }: { id_str: string }) => id_str !== "1443918489987600385").map(({ name }: { name: string }) => name.split(" ")[0])
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
