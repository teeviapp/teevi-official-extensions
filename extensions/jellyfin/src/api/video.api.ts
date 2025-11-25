import type { JellyfinSession } from "./session.api.ts"

type JellyfinMediaSource = {
  Id: string
  Container?: string
  SupportsTranscoding: boolean
  SupportsDirectStream: boolean
  SupportsDirectPlay: boolean
  TranscodingUrl?: string
}

export async function fetchVideoSource(
  session: JellyfinSession,
  options: { itemId: string }
): Promise<string> {
  const mediaSource = await fetchMediaSource(session, options)
  if (!mediaSource) {
    throw new Error("No media source found for item: " + options.itemId)
  }

  return makeVideoUrl(parseServerURL(session.api.basePath), options.itemId, {
    supportsDirectStream: mediaSource.SupportsDirectStream,
    container: mediaSource.Container,
    transcodingUrl: mediaSource.TranscodingUrl,
  })
}

async function fetchMediaSource(
  session: JellyfinSession,
  options: { itemId: string }
): Promise<JellyfinMediaSource> {
  type PlaybackInfoResponseData = {
    MediaSources: JellyfinMediaSource[]
  }
  const endpoint = new URL(
    `Items/${options.itemId}/PlaybackInfo`,
    parseServerURL(session.api.basePath)
  )

  const response = await fetch(endpoint.toString(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: session.api.authorizationHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      UserId: session.user.id,
      AlwaysBurnInSubtitleWhenTranscoding: false,
      DeviceProfile: AppleVideoDeviceProfile,
      EnableDirectPlay: true,
      EnableDirectStream: true,
      EnableTranscoding: true,
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to fetch playback info: " + response.statusText)
  }

  const data: PlaybackInfoResponseData = await response.json()

  if (!data.MediaSources || data.MediaSources.length === 0) {
    throw new Error("No media sources found")
  }

  return data.MediaSources[0]
}

function makeVideoUrl(
  server: URL,
  itemId: string,
  options: {
    supportsDirectStream: boolean
    container?: string
    transcodingUrl?: string
  }
): string {
  if (options.supportsDirectStream) {
    // If we are not using transcoding, we need to construct the direct stream URL
    const url = new URL(`Videos/${itemId}/stream`, server)

    if (options.container) {
      url.pathname += `.${options.container}`
    }

    if (options.supportsDirectStream) {
      url.searchParams.set("Static", "true")
    }

    return url.toString()
  }

  if (options.transcodingUrl) {
    const url = new URL(options.transcodingUrl, server)
    return url.toString()
  }

  throw new Error(
    "Video source configuration error: direct stream support is disabled and no transcoding URL was provided."
  )
}

const AppleVideoDeviceProfile = {
  DirectPlayProfiles: [
    {
      Container: "mp4",
      Type: "Video",
      VideoCodec: "h261,hevc,mpeg4,h264",
      AudioCodec: "aac,ac3,eac3,flac,alac",
    },
    {
      Container: "m4v",
      Type: "Video",
      VideoCodec: "h264,mpeg4",
      AudioCodec: "aac,ac3,alac",
    },
    {
      Container: "mov",
      Type: "Video",
      VideoCodec: "h264,hevc,mjpeg4,mpeg4",
      AudioCodec:
        "aac,ac3,alac,eac3,mp3,pcm_s16be,pcm_s16le,pcm_s24be,pcm_s24le",
    },
    {
      Container: "mpegts",
      Type: "Video",
      VideoCodec: "h264",
      AudioCodec: "aac,ac3,eac3,mp3",
    },
    {
      Container: "3gp",
      Type: "Video",
      VideoCodec: "h264,mpeg4",
      AudioCodec: "aac,amr_nb",
    },
    {
      Container: "3g2",
      Type: "Video",
      VideoCodec: "h264,mpeg4",
      AudioCodec: "aac,amr_nb",
    },
    {
      Container: "avi",
      Type: "Video",
      VideoCodec: "mjpeg",
      AudioCodec: "pcm_mulaw,pcm_s16le",
    },
  ],
  TranscodingProfiles: [
    {
      Container: "mp4",
      Type: "Video",
      AudioCodec: "aac,ac3,alac,eac3,flac",
      VideoCodec: "hevc,h264,mpeg4",
      Context: "Streaming",
      Protocol: "hls",
      MaxAudioChannels: "8",
      MinSegments: "2",
      BreakOnNonKeyFrames: true,
      EnableSubtitlesInManifest: true,
    },
  ],
  SubtitleProfiles: [
    { Format: "cc_dec", Method: "Embed" },
    { Format: "ttml", Method: "Embed" },
    { Format: "dvbsub", Method: "Encode" },
    { Format: "dvdsub", Method: "Encode" },
    { Format: "pgssub", Method: "Encode" },
    { Format: "xsub", Method: "Encode" },
    { Format: "vtt", Method: "Hls" },
  ],
}

function parseServerURL(input: string): URL {
  if (input.endsWith("/")) {
    return new URL(input)
  }
  return new URL(input + "/")
}
