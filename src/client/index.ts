import { TwitterClient } from "twitter-api-client"
import { TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET } from "../constants"

export const client = new TwitterClient({
  apiKey: TWITTER_API_KEY,
  apiSecret: TWITTER_API_SECRET,
  accessToken: TWITTER_ACCESS_TOKEN,
  accessTokenSecret: TWITTER_ACCESS_SECRET,
})
