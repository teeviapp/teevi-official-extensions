import { XMLParser } from "fast-xml-parser"
import { TeeviLiveProgram } from "@teeviapp/core"
import { writeFile, mkdir } from "fs/promises"
import { dirname } from "path"

type EPGData = {
  tv: {
    channel: {
      id: string
    }[]
    programme: {
      title: string
      desc?: string
      start: string
      stop: string
      channel: string
    }[]
  }
}

/**
 * Dictionary to map original channel IDs to playlist IDs.
 * Channels not in this dictionary will be filtered out
 */
const guideToCanonicalChannelMapping: Record<string, string> = {
  // LCN 1 - Rai 1
  "Rai1.it": "Rai1.it",
  "Rai 1": "Rai1.it",
  "Rai 1 HD.it": "Rai1.it",

  // LCN 2 - Rai 2
  "Rai2.it": "Rai2.it",
  "Rai 2": "Rai2.it",
  "Rai 2 HD.it": "Rai2.it",

  // LCN 3 - Rai 3
  "Rai3.it": "Rai3.it",
  "Rai 3": "Rai3.it",
  "Rai 3 HD.it": "Rai3.it",

  // LCN 4 - Rete 4
  "Rete4.it": "Rete4.it",
  "Rete 4": "Rete4.it",
  "Rete 4 HD.it": "Rete4.it",

  // LCN 5 - Canale 5
  "Canale5.it": "Canale5.it",
  "Canale 5": "Canale5.it",
  "Canale 5 HD.it": "Canale5.it",

  // LCN 6 - Italia 1
  "Italia1.it": "Italia1.it",
  "Italia 1": "Italia1.it",
  "Italia 1 HD.it": "Italia1.it",

  // LCN 7 - LA7
  "La7.it": "La7.it",
  La7: "La7.it",
  "LA7 HD.it": "La7.it",

  // LCN 8 - TV8
  "Tv8.it": "TV8.it",
  TV8: "TV8.it",
  "TV8 HD.it": "TV8.it",

  // LCN 9 - NOVE
  "Nove.it": "Nove.it",
  Nove: "Nove.it",
  "NOVE HD.it": "Nove.it",

  // LCN 10 - Rai 4
  "Rai4.it": "Rai4.it",
  "Rai 4": "Rai4.it",
  "Rai 4.it": "Rai4.it",

  // LCN 11 - Rai 5
  "Rai5.it": "Rai5.it",
  "Rai 5": "Rai5.it",
  "Rai 5.it": "Rai5.it",

  // LCN 12 - Rai Movie
  "Rai Movie.it": "RaiMovie.it",
  "Rai Movie": "RaiMovie.it",

  // LCN 13 - Rai Gulp
  "Rai Gulp.it": "RaiGulp.it",

  // LCN 14 - Rai Yoyo
  "Rai Yoyo.it": "RaiYoyo.it",

  // LCN 15 - La5
  "La5.it": "La5.it",
  "La 5": "La5.it",
  "La 5 HD.it": "La5.it",

  // LCN 16 - Iris
  "Iris.it": "Iris.it",
  Iris: "Iris.it",
  "Iris HD.it": "Iris.it",

  // LCN 17 - Cine34
  "Cine34.it": "Cine34.it",
  Cine34: "Cine34.it",
  "Cine34 HD.it": "Cine34.it",

  // LCN 19 - Rai News 24
  "Rai News.it": "RaiNews24.it",
  "Rai News 24.it": "RaiNews24.it",

  // LCN 20 - 20 Mediaset
  "20.it": "20.it",
  "20": "20.it",
  "20Mediaset HD.it": "20.it",

  // LCN 21 - LA7d
  "La7D.it": "La7d.it",
  La7d: "La7d.it",
  "LA7D.it": "La7d.it",

  // LCN 22 - HGTV
  "Hgtv.it": "HGTVItaly.it",
  "HGTV HD.it": "HGTVItaly.it",

  // LCN 23 - Food Network
  "Food Network Hd.it": "FoodNetworkItaly.it",
  "Food Network HD.it": "FoodNetworkItaly.it",

  // LCN 24 - Giallo
  "Giallo.it": "Giallo.it",
  Giallo: "Giallo.it",
  "GIALLO HD.it": "Giallo.it",

  // LCN 25 - DMAX
  "Dmax.it": "DMAXItaly.it",
  DMAX: "DMAXItaly.it",
  "DMAX HD.it": "DMAXItaly.it",

  // LCN 26 - Real Time
  "Realtime.it": "RealTimeItaly.it",
  "Real Time": "RealTimeItaly.it",
  "Real Time HD.it": "RealTimeItaly.it",

  // LCN 27 - Cielo
  "Cielo.it": "CieloTV.it",
  Cielo: "CieloTV.it",
  "cielo.it": "CieloTV.it",

  // LCN 28 - Focus
  "Focus.it": "Focus.it",
  Focus: "Focus.it",
  "Focus HD.it": "Focus.it",

  // LCN 29 - Mediaset Extra
  "Mediaset Extra.it": "MediasetExtra.it",
  "Mediaset Extra": "MediasetExtra.it",
  "Mediaset Extra HD.it": "MediasetExtra.it",

  // LCN 30 - Super!
  "Super.it": "Super.it",
  "Super!.it": "Super.it",

  // LCN 31 - Boing
  "Boing.it": "BoingItaly.it",
  Boing: "BoingItaly.it",

  // LCN 32 - K2
  "K2.it": "K2.it",
  K2: "K2.it",

  // LCN 33 - Frisbee
  "Frisbee.it": "Frisbee.it",
  Frisbee: "Frisbee.it",
  "-frisbee-.it": "Frisbee.it",

  // LCN 34 - Cartoonito
  "Cartoonito.it": "CartoonitoItaly.it",
  Cartoonito: "CartoonitoItaly.it",
  "CARTOONITO DTT.it": "CartoonitoItaly.it",

  // LCN 39 - Top Crime
  "Topcrime.it": "TopCrime.it",
  "Top Crime": "TopCrime.it",
  "TOPcrime HD.it": "TopCrime.it",

  // LCN 50+ - Altri
  "Tv2000.it": "TV2000.va",
  "TV2000 HD.it": "TV2000.va",

  "Rai Premium.it": "RaiPremium.it",

  "Rai Sport1.it": "RaiSport.it",
  "RAI Sport.it": "RaiSport.it",

  "Rai Storia.it": "RaiStoria.it",

  "Italia2.it": "Italia2.it",
  "Italia 2": "Italia2.it",
  "Mediaset Italia2 HD.it": "Italia2.it",

  "Twentyseven.it": "27Twentyseven.it",
  "Twenty Seven": "27Twentyseven.it",
  "27Twentyseven HD.it": "27Twentyseven.it",

  "Warner Tv.it": "WarnerTVItaly.it",
  "Warner TV": "WarnerTVItaly.it",

  "Motor Trend.it": "MotorTrend.it",
  "Motor Trend HD.it": "MotorTrend.it",

  "Rai 4K.it": "Rai4K.it",

  "Mediaset Tgcom24.it": "TGCom24.it",
  Tgcom24: "TGCom24.it",
  "TGCOM24 HD.it": "TGCom24.it",

  "Qvc.it": "QVCItaly.it",
}

/**
 * Checks if a channel ID exists in our mapping
 */
function isChannelSupported(channelId: string): boolean {
  return channelId in guideToCanonicalChannelMapping
}

/**
 * Maps an original channel ID to our preferred ID format
 */
function mapChannelId(originalId: string): string {
  if (isChannelSupported(originalId)) {
    return guideToCanonicalChannelMapping[originalId]
  } else {
    throw new Error(`Channel ID "${originalId}" is not supported`)
  }
}

/**
 * Converts a date string from format "20250606190500 +0000" to ISO UTC format
 * Example: "20250606190500 +0000" -> "2025-06-06T19:05:00Z"
 */
function parseDateToISOUTC(input: string): string {
  const match = input.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/)
  if (match) {
    const [_, year, month, day, hour, minute, second] = match
    const isoUTC = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
    return isoUTC
  } else {
    throw new Error("Invalid date format in input: " + input)
  }
}

async function fetchEPGData(url: string): Promise<string> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.text()
    return data
  } catch (error) {
    console.error("Error fetching EPG data:", error)
    throw error
  }
}

function parseEPGData(xmlData: string): EPGData {
  const parser = new XMLParser({
    ignoreAttributes: (name) => {
      return name !== "start" && name !== "stop" && name !== "channel"
    },
    attributeNamePrefix: "",
  })
  return parser.parse(xmlData)
}

function convertEPGProgrammeToTeeviLiveProgram(
  programme: EPGData["tv"]["programme"]
): TeeviLiveProgram[] {
  return programme
    .filter((program) => {
      return isChannelSupported(program.channel)
    })
    .map((program) => {
      let channelId = mapChannelId(program.channel)
      let sanitizedDescription =
        program.desc === "-" || !program.desc ? undefined : String(program.desc)
      let startDate = parseDateToISOUTC(program.start)
      let endDate = parseDateToISOUTC(program.stop)
      return {
        id: `${channelId}-${startDate.slice(0, 16)}`, // Unique ID based on channel and start time without seconds
        title: String(program.title),
        description: sanitizedDescription,
        startDate: startDate,
        endDate: endDate,
        channelId: channelId,
      }
    })
}

async function writeGuideToDisk() {
  const epgs = [
    parseEPGData(
      await fetchEPGData("https://tvit.leicaflorianrobert.dev/epg/list.xml")
    ),
    parseEPGData(
      await fetchEPGData("https://www.open-epg.com/files/italy1.xml")
    ),
  ]

  if (epgs.length === 0) {
    throw new Error("No EPG data fetched")
  }

  const seenIds = new Set<string>()
  const programs: TeeviLiveProgram[] = epgs
    .flatMap((epg) => convertEPGProgrammeToTeeviLiveProgram(epg.tv.programme))
    .filter((program) => {
      if (seenIds.has(program.id)) return false
      seenIds.add(program.id)
      return true
    })
    .sort((a, b) => {
      const channelComparison = a.channelId.localeCompare(b.channelId)
      return channelComparison !== 0
        ? channelComparison
        : a.startDate.localeCompare(b.startDate)
    })

  const outputFilePath = "assets/data/epg-guide.json"
  await mkdir(dirname(outputFilePath), { recursive: true })
  await writeFile(outputFilePath, JSON.stringify(programs, null, 2))
}

writeGuideToDisk()
