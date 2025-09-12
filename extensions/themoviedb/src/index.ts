import {
  type TeeviShowEpisode,
  type TeeviShowStatus,
  type TeeviMetadataExtension,
  type TeeviShow,
  type TeeviShowEntry,
  type TeeviFeedExtension,
  type TeeviFeedCollection,
} from "@teeviapp/core"
import {
  fetchShow as tmdbFetchShow,
  getImageURL as tmdbGetImageURL,
  fetchShowsByQuery as tmdbFetchList,
  type Movie as TMDBMovie,
  type TVSeries as TMDBTVSeries,
  type Show as TMDBShow,
  fetchSeason as tmdbFetchSeason,
  fetchImages as tmdbFetchImages,
  fetchRecommendations,
  fetchShowsFromDiscover,
  type DiscoverShowsParameters,
  type ShowMediaType,
} from "./tmdb-api"

const language = (): string => Teevi.language ?? "en-US"

function getShowDate(show: TMDBShow): string | undefined {
  if ("release_date" in show && show.release_date) {
    return show.release_date
  }
  if ("first_air_date" in show && show.first_air_date) {
    return show.first_air_date
  }
  return undefined
}

function mapTMDBShowToTeeviShowEntry(show: TMDBShow): TeeviShowEntry {
  const type = "title" in show ? "movie" : "tv"
  const date = getShowDate(show)
  return {
    kind: type === "movie" ? "movie" : "series",
    id: `${type}/${show.id.toString()}`,
    title: "title" in show ? show.title : show.name,
    posterURL: tmdbGetImageURL(show.poster_path, "poster"),
    year: date ? new Date(date).getFullYear() : undefined,
  }
}

async function fetchShowsByQuery(query: string): Promise<TeeviShowEntry[]> {
  const [movies, series] = await Promise.all([
    tmdbFetchList(query, "movie", language()),
    tmdbFetchList(query, "tv", language()),
  ])

  return [...movies, ...series]
    .filter((result) => {
      return getShowDate(result) != null && (result.vote_average ?? 0) > 0
    })
    .sort((a, b) => b.popularity - a.popularity)
    .map((result) => {
      return mapTMDBShowToTeeviShowEntry(result)
    })
}

async function fetchShow(showId: string): Promise<TeeviShow> {
  const mapStatus = (tmdbStatus?: string): TeeviShowStatus | undefined => {
    if (!tmdbStatus) return undefined
    const status = tmdbStatus.toLowerCase()
    if (
      [
        "in production",
        "post production",
        "planned",
        "pilot",
        "rumored",
        "announced",
      ].includes(status)
    ) {
      return "upcoming"
    }

    if (status === "returning series") return "airing"
    if (status === "canceled") return "canceled"

    if (status === "released" || status === "ended") return "ended"

    return undefined
  }

  const [type, id] = showId.split("/")
  if (type !== "movie" && type !== "tv") {
    throw new Error(
      `Invalid showId format: ${showId}. Expected format: "movie/123" or "tv/456"`
    )
  }

  const show = await tmdbFetchShow(id, type, language())
  const images = await tmdbFetchImages(id, type, language(), ["en", "null"])
  const logoPath = images.logos
    .sort((a, b) => b.vote_average - a.vote_average)
    .find((i) => !i.file_path.endsWith("svg"))?.file_path

  const cleanPosterPath = images.posters
    .sort((a, b) => b.vote_average - a.vote_average)
    .find((i) => !i.iso_639_1 && !i.file_path.endsWith("svg"))?.file_path

  const isMovie = type === "movie"

  const runtimeInMinutes = isMovie
    ? (show as TMDBMovie).runtime
    : (show as TMDBTVSeries).episode_run_time?.[0] ||
      (show as TMDBTVSeries).last_episode_to_air?.runtime

  const releaseDate = isMovie
    ? (show as TMDBMovie).release_date
    : (show as TMDBTVSeries).first_air_date

  const seasons = !isMovie
    ? (show as TMDBTVSeries).seasons
        .filter(
          (season) =>
            season.season_number > 0 &&
            season.air_date != null &&
            (season.episode_count ?? 0) > 0
        )
        .map((season) => ({
          number: season.season_number,
          name: season.name,
        }))
    : undefined

  const recommendations = await fetchRecommendations(id, type, language())

  return {
    kind: isMovie ? "movie" : "series",
    id: showId,
    title: "title" in show ? show.title : show.name,
    posterURL: tmdbGetImageURL(show.poster_path, "poster"),
    cleanPosterURL:
      cleanPosterPath && tmdbGetImageURL(cleanPosterPath, "poster"),
    backdropURL: tmdbGetImageURL(show.backdrop_path, "backdrop"),
    logoURL: logoPath ? tmdbGetImageURL(logoPath, "logo") : undefined,
    overview: show.overview,
    releaseDate: releaseDate,
    duration: (runtimeInMinutes ?? 0) * 60,
    seasons: seasons,
    genres: show.genres?.map((genre) => genre.name) ?? [],
    rating: show.vote_average,
    status: mapStatus(show.status),
    relatedShows: recommendations.map((show) =>
      mapTMDBShowToTeeviShowEntry(show)
    ),
  }
}

async function fetchEpisodes(
  showId: string,
  season: number
): Promise<TeeviShowEpisode[]> {
  const [type, id] = showId.split("/")

  if (type != "tv") return []

  const tmdbSeason = await tmdbFetchSeason(id, season, language())
  return tmdbSeason.episodes.map((episode) => {
    const episodeId = `${showId}/season=${season}&id=${episode.id}`
    return {
      id: episodeId,
      number: episode.episode_number,
      title: episode.name,
      overview: episode.overview,
      thumbnailURL: tmdbGetImageURL(episode.still_path, "still"),
      duration: episode.runtime * 60,
    } satisfies TeeviShowEpisode
  })
}

export default {
  fetchShowsByQuery,
  fetchShow,
  fetchEpisodes,
  fetchFeedCollections: async (): Promise<TeeviFeedCollection[]> => {
    type DiscoverParams = {
      type: ShowMediaType
      sorting: DiscoverShowsParameters["sorting"]
      category: TeeviFeedCollection["category"]
      name: TeeviFeedCollection["name"]
      id: TeeviFeedCollection["id"]
    }

    const collections: TeeviFeedCollection[] = []

    const discoverConfigs: DiscoverParams[] = [
      {
        type: "movie",
        sorting: "popularity",
        category: "hot",
        name: "Popular Movies",
        id: "tmdb-popular-movies",
      },
      {
        type: "tv",
        sorting: "popularity",
        category: "hot",
        name: "Popular TV Shows",
        id: "tmdb-popular-tv-shows",
      },
      {
        type: "movie",
        sorting: "rating",
        category: "recommended",
        name: "Top Rated Movies",
        id: "tmdb-top-rated-movies",
      },
      {
        type: "tv",
        sorting: "rating",
        category: "recommended",
        name: "Top Rated TV Shows",
        id: "tmdb-top-rated-tv-shows",
      },
      {
        type: "movie",
        sorting: "release_date",
        category: "new",
        name: "New Movies",
        id: "tmdb-new-movies",
      },
      {
        type: "tv",
        sorting: "release_date",
        category: "new",
        name: "New TV Shows",
        id: "tmdb-new-tv-shows",
      },
    ]

    for (const config of discoverConfigs) {
      const shows = await fetchShowsFromDiscover(config.type, language(), {
        sorting: config.sorting,
        maximumPages: 4,
        minimumUserVotes: 100,
      })

      if (shows.length > 0) {
        collections.push({
          id: config.id,
          name: config.name,
          shows: shows.map(mapTMDBShowToTeeviShowEntry),
          category: config.category,
        })
      }
    }

    return collections
  },
  fetchTrendingShows: async (): Promise<TeeviShow[]> => {
    // TODO: implements trending shows
    return []
  },
} satisfies TeeviMetadataExtension & TeeviFeedExtension
