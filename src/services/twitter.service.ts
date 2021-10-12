import axios from "axios"
import axiosRateLimit from "axios-rate-limit"
import { createHmac } from "crypto"
import qs from "qs"
import { StatusesUpdateParams, TwitterClient } from "twitter-api-client"
import { client } from "../client"
import { TWITTER_API_ENDPOINT, TWITTER_API_SECRET, TWITTER_WEBHOOK_ENDPOINT } from "../constants"
import { MessageModel } from "../entities"
import { SubscriptionType, WebhookType } from "../types"
import { OAuthService } from "./oauth.service"

export class TwitterService {
  oAuthService: OAuthService

  client: TwitterClient

  constructor() {
    this.oAuthService = new OAuthService()
    this.client = client
  }

  webhooks: Array<WebhookType> = []

  subscriptions: Array<SubscriptionType> = []

  async init() {
    await this.getAllWebhooks()

    if (this.webhooks.length > 0) {
      await Promise.all(
        this.webhooks.map(async ({ id }) => {
          await this.removeWebhook(id)
        })
      )

      this.webhooks = []
    }

    await this.registerWebhook()
    await this.registerSubscription()
    await this.getAllSubscriptions()
  }

  private http = axiosRateLimit(axios.create(), {
    maxRequests: 900,
    perMilliseconds: 1000 * 60 * 15, // 15 minutes
  })

  private async getAllWebhooks() {
    const url = `${TWITTER_API_ENDPOINT}/account_activity/all/prod/webhooks.json`

    console.log("Checking for existing webhooks")

    try {
      const { data } = (await this.http.get(url, {
        headers: {
          Authorization: this.oAuthService.oAuth02aHeader,
        },
      })) as { data: Array<WebhookType> }

      if (data && data.length > 0) {
        console.log(`Following webhooks found: ${data.map((wh) => wh.id).join(", ")}`)

        this.webhooks.push(...data)
      } else {
        console.log("No webhook found.")
      }
    } catch (err: any) {
      console.error("Couldn't connect because: ", err.response.data)
    }
  }

  private async getAllSubscriptions() {
    const url = `${TWITTER_API_ENDPOINT}/account_activity/all/prod/subscriptions/list.json`

    console.log("Checking for existing subscriptions.")

    try {
      const { data } = (await this.http.get(url, {
        headers: {
          Authorization: this.oAuthService.oAuth02aHeader,
        },
      })) as { data: { subscriptions: Array<SubscriptionType> } }

      if (data && data.subscriptions.length > 0) {
        console.log(`Following subscriptions found: ${data.subscriptions.map((s) => s.user_id).join(", ")}`)

        this.subscriptions.push(...data.subscriptions)
      } else {
        console.log("No subscriptions found.")
      }
    } catch (err: any) {
      console.error("Couldn't connect because: ", err.response.data)
    }
  }

  triggerChallenge() {
    if (this.webhooks.length < 1) {
      return
    }

    const url = `${TWITTER_API_ENDPOINT}/account_activity/all/prod/webhooks/${this.webhooks[0]!.id}.json`

    console.log("Triggering Twitter CRC")

    this.http
      .put(url, null, {
        headers: {
          Authorization: this.oAuthService.oAuth01aHeader(url, "PUT"),
        },
      })
      .catch((err) => console.error(err.response))
  }

  private async registerWebhook() {
    const url = `${TWITTER_API_ENDPOINT}/account_activity/all/prod/webhooks.json`

    console.log(`Creating a POST request to ${url} for webhook registration of webhook url ${TWITTER_WEBHOOK_ENDPOINT}`)

    const params = {
      url: TWITTER_WEBHOOK_ENDPOINT,
    }

    try {
      const { data } = (await this.http.post(url, qs.stringify(params), {
        headers: {
          "Content-type": "application/x-www-form-urlencoded",
          Authorization: this.oAuthService.oAuth01aHeader(url, "POST", params),
        },
      })) as { data: WebhookType }

      console.log(`Webhook registered as ${data.id}`)
      this.webhooks.push(data)
    } catch (err) {
      console.error(err)
    }
  }

  private async removeWebhook(webhookId: string) {
    const url = `${TWITTER_API_ENDPOINT}/account_activity/all/prod/webhooks/${webhookId}.json`

    console.warn(`Removing the webhook ${webhookId}`)

    try {
      await this.http.delete(url, {
        headers: {
          Authorization: this.oAuthService.oAuth01aHeader(url, "DELETE"),
        },
      })
      console.log(`Webhook ${webhookId} removed`)
    } catch (err) {
      console.error(err)
    }
  }

  private async registerSubscription() {
    if (this.webhooks.length < 1) {
      console.log("No webhook registered yet.")
      return
    }

    const url = `${TWITTER_API_ENDPOINT}/account_activity/all/prod/subscriptions.json`

    console.log(`Creating a POST request to ${url} for subscriptions registration.`)

    try {
      await this.http.post(url, null, {
        headers: {
          Authorization: this.oAuthService.oAuth01aHeader(url, "POST"),
        },
      })

      console.log("Subscription registered.")
    } catch (err) {
      console.error(err)
    }
  }

  createChallengeResponse(crcToken: string) {
    console.log("Creating the required hash")

    const hmac = createHmac("sha256", TWITTER_API_SECRET).update(crcToken).digest("base64")

    console.log("Hash created")

    return `sha256=${hmac}`
  }

  async createHugTweet({ text, media_id, sender_id, receiver_id }: { text: string; media_id?: string | null; sender_id: string; receiver_id: string }) {
    try {
      const params: StatusesUpdateParams = { status: text }

      if (media_id) {
        params.media_ids = media_id
      }

      await this.client.tweets.statusesUpdate(params)

      await MessageModel.create({ text, media_id, is_anonymous: true, sender_id, receiver_id })
    } catch (err) {
      console.error(err)
    }
  }
}
