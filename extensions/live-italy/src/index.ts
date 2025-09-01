import type {
  TeeviLiveChannel,
  TeeviLiveExtension,
  TeeviLiveProgram,
} from "@teeviapp/core"
import playlistParser from "iptv-playlist-parser"

type ChannelCategory = "National DVB-T" | "Satellite" | "Regional DVB-T"

const channelCategoryMap: Record<string, ChannelCategory> = {
  "Rai1.it": "National DVB-T",
  "Rai2.it": "National DVB-T",
  "Rai3.it": "National DVB-T",
  "Rete4.it": "National DVB-T",
  "Canale5.it": "National DVB-T",
  "Italia1.it": "National DVB-T",
  "La7.it": "National DVB-T",
  "TV8.it": "National DVB-T",
  "Nove.it": "National DVB-T",
  "20.it": "National DVB-T",
  "Rai4.it": "National DVB-T",
  "Iris.it": "National DVB-T",
  "Rai5.it": "National DVB-T",
  "RaiMovie.it": "National DVB-T",
  "RaiPremium.it": "National DVB-T",
  "CieloTV.it": "National DVB-T",
  "27Twentyseven.it": "National DVB-T",
  "TV2000.va": "National DVB-T",
  "La7d.it": "National DVB-T",
  "La5.it": "National DVB-T",
  "RealTimeItaly.it": "National DVB-T",
  "QVCItaly.it": "National DVB-T",
  "FoodNetworkItaly.it": "National DVB-T",
  "Cine34.it": "National DVB-T",
  "Focus.it": "National DVB-T",
  "RTL1025TV.it": "National DVB-T",
  "WarnerTVItaly.it": "National DVB-T",
  "Giallo.it": "National DVB-T",
  "TopCrime.it": "National DVB-T",
  "BoingItaly.it": "National DVB-T",
  "K2.it": "National DVB-T",
  "RaiGulp.it": "National DVB-T",
  "RaiYoyo.it": "National DVB-T",
  "Frisbee.it": "National DVB-T",
  "CartoonitoItaly.it": "National DVB-T",
  "Super.it": "National DVB-T",
  "RaiNews24.it": "National DVB-T",
  "Italia2.it": "National DVB-T",
  "SkyTG24.it": "National DVB-T",
  "TGCom24.it": "National DVB-T",
  "DMAXItaly.it": "National DVB-T",
  "RaiStoria.it": "National DVB-T",
  "MediasetExtra.it": "National DVB-T",
  "HGTVItaly.it": "National DVB-T",
  "RaiScuola.it": "National DVB-T",
  "RaiSport.it": "National DVB-T",
  "MotorTrend.it": "National DVB-T",
  "Sportitalia.it": "National DVB-T",
  "TravelTV.it": "National DVB-T",
  "DonnaTV.it": "National DVB-T",
  "SuperTennis.it": "National DVB-T",
  "AlmaTV.it": "National DVB-T",
  "Radio105TV.it": "National DVB-T",
  "R101TV.it": "National DVB-T",
  "DeejayTV.it": "National DVB-T",
  "RadioItaliaTV.it": "National DVB-T",
  "KissKissTV.it": "National DVB-T",
  "RaiRadio2Visual.it": "National DVB-T",
  "RTL1025Traffic.it": "National DVB-T",
  "Radio24TV.it": "National DVB-T",
  "RadioFrecciaTV.it": "National DVB-T",
  "RDSSocialTV.it": "National DVB-T",
  "RadioZetaTV.it": "National DVB-T",
  "RadioTVSerieA.it": "National DVB-T",

  "SportitaliaSolocalcio.it": "Satellite",
  "Bike.it": "Satellite",
  "RadioMonteCarloTV.it": "Satellite",
  "VirginRadioTV.it": "Satellite",
  "SenatoTV.it": "Satellite",
  "CameradeiDeputati.it": "Satellite",
  "Rai4K.it": "Satellite",
  "UniNettunoUniversityTV.it": "Satellite",
}

async function fetchPlaylist(): Promise<playlistParser.Playlist> {
  const response = await fetch(
    "https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_italy.m3u8"
  )
  if (!response.ok) {
    throw new Error(
      `Failed to fetch playlist: ${response.status} ${response.statusText}`
    )
  }

  const playlistContent = await response.text()
  return playlistParser.parse(playlistContent)
}

async function fetchPrograms(): Promise<TeeviLiveProgram[]> {
  const response = await fetch(
    "https://teeviapp.github.io/teevi-official-extensions/data/live-italy/epg-guide.json"
  )
  if (!response.ok) {
    throw new Error(
      `Failed to fetch programs: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}

export default {
  fetchLiveChannels: async () => {
    const playlist = await fetchPlaylist()
    const channels: TeeviLiveChannel[] = playlist.items.map((item) => {
      const id = item.tvg.id || item.name.replace(/\s+/g, ".").toLowerCase()
      return {
        id,
        name: item.name.replace(/[ⒼⓈ]/g, "").trim(),
        type: "channel",
        logoURL: item.tvg.logo,
        language: "it",
        geoblocked: item.tvg.name.includes("Ⓖ"),
        category: channelCategoryMap[item.tvg.id] || "Regional DVB-T",
      }
    })
    return channels.filter((channel) => channel.category !== "Regional DVB-T")
  },
  fetchChannelPrograms: async (startDate?: string, endDate?: string) => {
    let programs = await fetchPrograms()
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0)
      const end = endDate ? new Date(endDate) : new Date(8640000000000000)

      return programs.filter((program) => {
        const programStart = new Date(program.startDate)
        const programEnd = new Date(program.endDate)

        return programStart <= end && programEnd >= start
      })
    }

    return programs
  },
  fetchLiveVideoAsset: async (channelId: string) => {
    const playlist = await fetchPlaylist()
    const channel = playlist.items.find((item) => {
      const itemId = item.tvg.id || item.name.replace(/\s+/g, ".").toLowerCase()
      return itemId === channelId
    })
    if (!channel) {
      return null
    }

    let headers: Record<string, string> = {}
    if (channel.http?.referrer) {
      headers["Referer"] = channel.http.referrer
    }
    if (channel.http?.["user-agent"]) {
      headers["User-Agent"] = channel.http["user-agent"]
    }

    return {
      url: channel.url,
      headers: headers,
    }
  },
} satisfies TeeviLiveExtension
