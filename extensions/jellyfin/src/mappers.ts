import type { BaseItemDto, ImageType } from "@jellyfin/sdk/lib/generated-client"
import type {
  TeeviShow,
  TeeviShowEntry,
  TeeviShowEpisode,
  TeeviShowSeason,
} from "@teeviapp/core"
import type { JellyfinSession } from "./api/session.api.ts"
import { getImageApi } from "@jellyfin/sdk/lib/utils/api"

/**
 * Maps a Jellyfin item to a full Teevi show entry
 */
export function mapJellyfinItemToTeeviShowEntry(
  item: BaseItemDto,
  session: JellyfinSession
): TeeviShowEntry {
  return {
    kind: item.Type === "Movie" ? "movie" : "series",
    id: item.Id!,
    title: item.Name!,
    posterURL: makeImageURL(item, session, "Primary", "low"),
    year: getYear(item),
  }
}

/**
 * Maps a Jellyfin item to a full Teevi show
 */
export function mapJellyfinItemToTeeviShow(
  item: BaseItemDto,
  session: JellyfinSession
): TeeviShow {
  return {
    kind: item.Type === "Movie" ? "movie" : "series",
    id: item.Id!,
    title: item.Name!,
    overview: item.Overview ?? "",
    releaseDate: getFormattedReleaseDate(item),
    genres: item.Genres ?? [],
    duration: calculateDuration(item.RunTimeTicks),
    posterURL: makeImageURL(item, session, "Primary", "high"),
    backdropURL: makeImageURL(item, session, "Backdrop", "high"),
    logoURL: makeImageURL(item, session, "Logo", "high"),
    rating: item.CommunityRating ?? undefined,
  }
}

export function mapJellyfinItemToTeeviSeason(
  item: BaseItemDto
): TeeviShowSeason {
  return {
    number: item.IndexNumber!,
    name: item.Name ?? undefined,
  }
}

export function mapJellyfinItemToTeeviEpisode(
  item: BaseItemDto,
  session: JellyfinSession
): TeeviShowEpisode {
  return {
    id: item.Id!,
    number: item.IndexNumber!,
    title: item.Name ?? undefined,
    thumbnailURL: makeImageURL(item, session, "Primary", "medium"),
    overview: item.Overview ?? "",
    duration: calculateDuration(item.RunTimeTicks),
  }
}

function getFormattedReleaseDate(item: BaseItemDto): string {
  if (item.PremiereDate) {
    return new Date(item.PremiereDate).toISOString().split("T")[0]
  }
  return new Date().toISOString().split("T")[0]
}

function getYear(item: BaseItemDto): number | undefined {
  if (item.PremiereDate) {
    return new Date(item.PremiereDate).getFullYear()
  }
  return item.ProductionYear ?? undefined
}

function calculateDuration(runTimeTicks: number | null | undefined): number {
  if (!runTimeTicks) return 0
  return Math.round(runTimeTicks / 10_000_000)
}

type ImageQuality = "low" | "medium" | "high" | "original"

function makeImageURL(
  item: BaseItemDto,
  session: JellyfinSession,
  type: ImageType,
  quality: ImageQuality
): string | undefined {
  let qualityNumber: number | undefined
  let maxWidth: number | undefined
  switch (quality) {
    case "low":
      maxWidth = 200
      qualityNumber = 70
      break
    case "medium":
      maxWidth = 500
      qualityNumber = 80
      break
    case "high":
      maxWidth = 1000
      qualityNumber = 90
      break
    case "original":
      // No resizing or quality modifications for original images.
      break
  }

  return getImageApi(session.api).getItemImageUrl(item, type, {
    quality: qualityNumber,
    maxWidth: maxWidth,
  })
}
