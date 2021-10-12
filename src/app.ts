import express from "express"
import mongoose from "mongoose"
import cron from "node-cron"
import { DB_URL, PORT } from "./constants"
import { TwitterService } from "./services"
import { twitterWebhookRouter } from "./webhook"

export const runApp = async () => {
  const app = express()

  app.use(express.json())

  app.use("/_webhook/twitter", twitterWebhookRouter)

  app.listen(PORT, () => console.log(`Server up and running on port ${PORT}`))

  mongoose.connect(DB_URL, {}, () => console.log("DB connected"))

  const twitter = new TwitterService()

  await twitter.init()

  cron.schedule("*/25 * * * *", twitter.triggerChallenge)
}
