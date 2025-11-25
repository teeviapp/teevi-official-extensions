import {
  Api,
  API_VERSION,
  MINIMUM_VERSION,
  ProductNameIssue,
  RecommendedServerInfoScore,
  SlowResponseIssue,
  SystemInfoIssue,
  VersionMissingIssue,
  VersionOutdatedIssue,
  VersionUnsupportedIssue,
} from "@jellyfin/sdk"
import { getSystemApi, getUserApi } from "@jellyfin/sdk/lib/utils/api"
import { Jellyfin } from "@jellyfin/sdk/lib/jellyfin"
import type { RecommendedServerInfo } from "@jellyfin/sdk/lib/models/recommended-server-info"
import { isVersionLess } from "@jellyfin/sdk/lib/utils"
import type { PublicSystemInfo } from "@jellyfin/sdk/lib/generated-client"

export type JellyfinSession = {
  api: Api
  user: {
    token: string
    id: string
  }
}

export type JellyfinCredentials = {
  server: string
  username: string
  password: string
}

const client = new Jellyfin({
  clientInfo: {
    name: '"Teevi for Jellyfin"',
    version: "1.0.0",
  },
  deviceInfo: {
    name: "Teevi Client",
    id: "Tv-id", //Math.random().toString(36).substring(2, 11),
  },
})

export async function authenticateWithCredentials(
  input: JellyfinCredentials
): Promise<JellyfinSession> {
  const servers = await getRecommendedServerCandidates(input.server)
  if (!servers) {
    throw new Error(`No server found for ${input.server}`)
  }

  const best = client.discovery.findBestServer(servers)
  if (!best) {
    throw new Error("No Best server found")
  }

  const api = client.createApi(best.address)
  const auth = await getUserApi(api).authenticateUserByName({
    authenticateUserByName: { Username: input.username, Pw: input.password },
  })
  if (!auth.data.User?.Id || !auth.data.AccessToken) {
    throw new Error("Authentication failed")
  }

  return {
    api,
    user: {
      token: auth.data.AccessToken,
      id: auth.data.User.Id,
    },
  }
}

const PRODUCT_NAME = "Jellyfin Server"
const SLOW_RESPONSE_TIME_MS = 3000 // Requests taking longer than 3s are considered slow.

interface SystemInfoResult {
  address: string
  data: PublicSystemInfo | null
  error: any | null
  responseTime: number
}

/**
 * Gets the minimum RecommendedServerInfoScore from an array of scores.
 */
function getMinScore(
  scores: Array<RecommendedServerInfoScore>,
  defaultScore = RecommendedServerInfoScore.GREAT
): RecommendedServerInfoScore {
  return scores.length > 0 ? Math.min(...scores) : defaultScore
}

/**
 * Evaluates server system data to determine scores and issues.
 */
function evaluateServerData(
  result: SystemInfoResult
): Pick<RecommendedServerInfo, "score" | "issues"> {
  const issues: any[] = []
  const scores: RecommendedServerInfoScore[] = []
  const data = result.data

  if (!data || result.error) {
    issues.push(new SystemInfoIssue(result.error))
    scores.push(RecommendedServerInfoScore.BAD)
  } else {
    if (data.ProductName !== PRODUCT_NAME) {
      issues.push(new ProductNameIssue(data.ProductName))
      scores.push(RecommendedServerInfoScore.BAD)
    }

    const version = data.Version
    try {
      if (!version) {
        issues.push(new VersionMissingIssue())
        scores.push(RecommendedServerInfoScore.BAD)
      } else if (isVersionLess(version, MINIMUM_VERSION)) {
        issues.push(new VersionUnsupportedIssue(version))
        scores.push(RecommendedServerInfoScore.OK)
      } else if (isVersionLess(version, API_VERSION)) {
        issues.push(new VersionOutdatedIssue(version))
        scores.push(RecommendedServerInfoScore.GOOD)
      }
    } catch (e) {
      if (e instanceof TypeError) {
        issues.push(new VersionMissingIssue())
        scores.push(RecommendedServerInfoScore.BAD)
      }
    }
  }

  if (result.responseTime > SLOW_RESPONSE_TIME_MS) {
    issues.push(new SlowResponseIssue(result.responseTime))
    if (!scores.includes(RecommendedServerInfoScore.BAD)) {
      scores.push(RecommendedServerInfoScore.GOOD)
    }
  }

  return {
    score: getMinScore(scores),
    issues,
  }
}

/**
 * Maps the raw system info result into the final RecommendedServerInfo structure.
 */
function toRecommendedServerInfo(
  result: SystemInfoResult
): RecommendedServerInfo {
  const { score, issues } = evaluateServerData(result)

  return {
    address: result.address,
    responseTime: result.responseTime,
    score: score,
    issues: issues,
    systemInfo: result.data ?? undefined,
  }
}

/**
 * Attempts to retrieve system information from a single server candidate.
 */
async function fetchSystemInfo(candidate: string): Promise<SystemInfoResult> {
  let responseTime = 0
  let data: PublicSystemInfo | null = null
  let error: any = null

  try {
    const api = client.createApi(candidate)
    const startTime = Date.now()

    // Timeout mechanism removed here
    const response = await getSystemApi(api).getPublicSystemInfo()

    responseTime = Date.now() - startTime
    data = response.data
  } catch (e) {
    error = e
  }

  return {
    address: candidate,
    responseTime,
    data,
    error,
  }
}

/**
 * Gets recommended server candidates by testing all candidates in parallel.
 * Throws an error if no candidates are found.
 */
export async function getRecommendedServerCandidates(
  input: string
): Promise<RecommendedServerInfo[]> {
  const candidates = client.discovery.getAddressCandidates(input)

  if (!candidates || candidates.length === 0) {
    throw new Error(`No candidates found for input: ${input}`)
  }

  // Execute all fetches concurrently using Promise.allSettled
  const resultsPromises = candidates.map((candidate) =>
    fetchSystemInfo(candidate)
  )
  const settledResults = await Promise.allSettled(resultsPromises)

  // Filter only fulfilled results and map them to the final structure
  return settledResults
    .filter(
      (res): res is PromiseFulfilledResult<SystemInfoResult> =>
        res.status === "fulfilled"
    )
    .map((res) => toRecommendedServerInfo(res.value))
}
