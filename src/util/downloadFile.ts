import axios from "axios"
import { createWriteStream } from "fs"
import * as stream from "stream"
import { promisify } from "util"
import { OAuthService } from "../services"

const finished = promisify(stream.finished)

export async function downloadFile(fileUrl: string, outputLocationPath: string): Promise<any> {
  const writer = createWriteStream(outputLocationPath)
  return axios
    .get<stream>(fileUrl, {
      responseType: "stream",
      headers: {
        Authorization: new OAuthService().oAuth01aHeader(fileUrl, "get"),
      },
    })
    .then(async (response) => {
      response.data.pipe(writer)
      return finished(writer)
    })
    .catch(console.error)
}
