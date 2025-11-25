import "core-js/web"
import type {
  TeeviFeedCollection,
  TeeviFeedExtension,
  TeeviMetadataExtension,
  TeeviShow,
  TeeviShowEntry,
  TeeviShowEpisode,
  TeeviVideoAsset,
  TeeviVideoExtension,
} from "@teeviapp/core"
import {
  authenticateWithCredentials,
  type JellyfinCredentials,
  type JellyfinSession,
} from "./api/session.api.ts"
import {
  mapJellyfinItemToTeeviEpisode,
  mapJellyfinItemToTeeviSeason,
  mapJellyfinItemToTeeviShow,
  mapJellyfinItemToTeeviShowEntry,
} from "./mappers.ts"
import {
  fetchGenres,
  fetchItem,
  fetchItems,
  fetchSeasons,
  fetchSimilarItems,
  fetchSeasonEpisodes,
  fetchUserViews,
} from "./api/library.api.ts"
import { fetchVideoSource } from "./api/video.api.ts"
import { getSessionApi } from "@jellyfin/sdk/lib/utils/api"

async function requireSession(): Promise<JellyfinSession> {
  const input: JellyfinCredentials = {
    server: Teevi.getInputValueById("server") ?? "",
    username: Teevi.getInputValueById("username") ?? "",
    password: Teevi.getInputValueById("password") ?? "",
  }

  // Validate input
  if (!input.server || !input.username) {
    throw new Error("Server and Username are required")
  }

  return authenticateWithCredentials(input)
}

async function logoutSession(session: JellyfinSession) {
  await getSessionApi(session.api).reportSessionEnded()
}

async function runWithSession<TResult>(
  action: (session: JellyfinSession) => TResult | Promise<TResult>
): Promise<TResult> {
  const session = await requireSession()
  try {
    return await action(session)
  } finally {
    await logoutSession(session)
  }
}

async function fetchShowsByQuery(query: string): Promise<TeeviShowEntry[]> {
  return await runWithSession(async (session) => {
    const items = await fetchItems(session, {
      searchTerm: query,
    })

    return items.map((item) => mapJellyfinItemToTeeviShowEntry(item, session))
  })
}

async function fetchShow(showId: string): Promise<TeeviShow> {
  return await runWithSession(async (session) => {
    const item = await fetchItem(session, { itemId: showId })
    const teeviShow = mapJellyfinItemToTeeviShow(item, session)

    // Add seasons if it's a TV show
    if (item.Type === "Series") {
      const seasons = await fetchSeasons(session, { seriesId: showId })
      teeviShow.seasons = seasons.map((s) => mapJellyfinItemToTeeviSeason(s))
    }

    try {
      const similar = await fetchSimilarItems(session, {
        itemId: showId,
      })
      teeviShow.relatedShows = similar.map((item) =>
        mapJellyfinItemToTeeviShowEntry(item, session)
      )
    } catch (error) {
      console.error("Failed to fetch similar shows:", error)
      teeviShow.relatedShows = []
    }

    return teeviShow
  })
}

async function fetchEpisodes(
  showId: string,
  season: number
): Promise<TeeviShowEpisode[]> {
  return await runWithSession(async (session) => {
    const seasons = await fetchSeasons(session, {
      seriesId: showId,
    })

    const seasonId = seasons.find((s) => s.IndexNumber === season)?.Id
    if (!seasonId) {
      throw new Error(`Season ${season} not found`)
    }

    const episodes = await fetchSeasonEpisodes(session, {
      seriesId: showId,
      seasonId: seasonId,
    })

    return episodes.map((episode) =>
      mapJellyfinItemToTeeviEpisode(episode, session)
    )
  })
}

async function fetchFeedCollections(): Promise<TeeviFeedCollection[]> {
  return await runWithSession(async (session) => {
    const views = await fetchUserViews(session)
    const genres = await fetchGenres(session)

    let feedCollections: TeeviFeedCollection[] = []

    for (const view of views) {
      if (!view.Id) continue
      const items = await fetchItems(session, {
        parentId: view.Id,
      })
      if (!items) continue
      feedCollections.push({
        id: "view-" + view.Id,
        name: view.Name ?? view.CollectionType!,
        shows: items.map((item) =>
          mapJellyfinItemToTeeviShowEntry(item, session)
        ),
        category: view.CollectionType === "tvshows" ? "series" : "movies",
      })
    }

    // Add genres as collections
    for (const genre of genres) {
      if (!genre.Id) continue
      const items = await fetchItems(session, {
        genreIds: [genre.Id],
      })
      if (!items) continue
      feedCollections.push({
        id: "genre-" + genre.Id,
        name: genre.Name!,
        shows: items.map((item) =>
          mapJellyfinItemToTeeviShowEntry(item, session)
        ),
      })
    }

    return feedCollections
  })
}

async function fetchTrendingShows(): Promise<TeeviShow[]> {
  return await runWithSession(async (session) => {
    const favoriteItems = await fetchItems(session, {
      filters: ["IsFavorite"],
    })

    return favoriteItems.map((item) => {
      let show = mapJellyfinItemToTeeviShow(item, session)
      show.overview = item.Taglines?.[0] ?? show.overview
      return show
    })
  })
}

async function fetchVideoAssets(mediaId: string): Promise<TeeviVideoAsset[]> {
  return await runWithSession(async (session) => {
    const source = await fetchVideoSource(session, { itemId: mediaId })
    return [{ url: source }]
  })
}

export default {
  fetchShowsByQuery,
  fetchShow,
  fetchEpisodes,
  fetchFeedCollections,
  fetchTrendingShows,
  fetchVideoAssets,
} satisfies TeeviMetadataExtension & TeeviFeedExtension & TeeviVideoExtension
