import { readFileSync, statSync, unlinkSync } from "fs"
import { downloadFile } from "."
import { client } from "../client"

export const getMediaId = async (attachment: any, sender_id: string): Promise<string | null> => {
  if (!attachment || attachment.type !== "media") return null

  const { media } = attachment

  if (media.type !== "photo" && media.type !== "animated_gif") return null

  if (media.type === "photo") {
    const path = `./${media.id_str}.jpg`

    try {
      await downloadFile(media.media_url, path)

      const { media_id_string } = await client.media.mediaUpload({ media_data: readFileSync(path).toString("base64"), media_category: "tweet_image" })

      unlinkSync(path)

      return media_id_string
    } catch (err) {
      unlinkSync(path)

      await client.directMessages.eventsNew({ event: { type: "message_create", message_create: { message_data: { text: "Could not use the media you sent." }, target: { recipient_id: sender_id } } } })

      console.error(err)

      throw err
    }
  }

  const path = `./${media.id_str}.mp4`

  try {
    await downloadFile(media.video_info.variants[0].url, path)

    const { media_id_string } = await client.media.mediaUploadInit({ command: "INIT", media_type: media.video_info.variants[0].content_type, total_bytes: statSync(path).size, media_category: "tweet_video" })

    await client.media.mediaUploadAppend({ command: "APPEND", media_id: media_id_string, segment_index: "0", media_data: readFileSync(path).toString("base64") })

    await client.media.mediaUploadFinalize({ command: "FINALIZE", media_id: media_id_string })

    await new Promise((res, rej) => {
      setInterval(async () => {
        try {
          const {
            processing_info: { state },
          } = await client.media.mediaUploadStatus({ media_id: media_id_string, command: "STATUS" })

          if (state === "succeeded") {
            res(true)
          } else {
            console.log("waiting")
          }
        } catch (err) {
          rej(err)
        }
      }, 2000)
    })

    unlinkSync(path)

    return media_id_string
  } catch (err) {
    unlinkSync(path)

    await client.directMessages.eventsNew({ event: { type: "message_create", message_create: { message_data: { text: "Could not use the media you sent." }, target: { recipient_id: sender_id } } } })

    console.error(err)

    throw err
  }
}
