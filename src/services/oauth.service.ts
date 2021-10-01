import { createHmac } from "crypto"
import OAuth from "oauth-1.0a"
import { TWITTER_ACCESS_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_BEARER_TOKEN } from "../constants"

export class OAuthService {
  private token: OAuth.Token = {
    key: TWITTER_ACCESS_TOKEN,
    secret: TWITTER_ACCESS_SECRET,
  }

  oAuth01aHeader = (url: string, method: string, data?: any): string => {
    const oauth = new OAuth({
      consumer: {
        key: TWITTER_API_KEY,
        secret: TWITTER_API_SECRET,
      },
      signature_method: "HMAC-SHA1",
      hash_function: (baseString, key) => createHmac("sha1", key).update(baseString).digest("base64"),
    })
    return oauth.toHeader(oauth.authorize({ url, method, data }, this.token)).Authorization
  }

  get oAuth02aHeader(): string {
    return `Bearer ${TWITTER_BEARER_TOKEN}`
  }
}
