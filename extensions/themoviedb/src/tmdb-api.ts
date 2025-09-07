const API_URL: string = "https://api.themoviedb.org/3"

const CDN_URL: string = "https://image.tmdb.org/t/p"

const API_TOKEN: string = (() => {
  const tokenFromTeevi = globalThis.Teevi?.getInputValueById("api.token")
  if (tokenFromTeevi) return tokenFromTeevi

  const tokenFromEnv = import.meta.env.VITE_API_TOKEN
  if (tokenFromEnv) return tokenFromEnv

  throw new Error("API token is not defined")
})()

export type CollectionItem = Show & {
  media_type: ShowMediaType
}

export type Show = Movie | TVSeries

export type ShowMediaType = "movie" | "tv"

export type Movie = {
  id: number
  title: string
  poster_path: string
  backdrop_path: string
  overview: string
  release_date: string
  runtime: number
  genres?: Genre[]
  vote_average?: number
  popularity: number
  status?: string
}

export type TVSeries = {
  id: number
  name: string
  poster_path: string
  backdrop_path: string
  overview: string
  first_air_date: string
  episode_run_time?: number[]
  number_of_seasons: number
  genres?: Genre[]
  vote_average?: number
  popularity: number
  last_episode_to_air?: {
    runtime?: number
  }
  seasons: Season[]
  status?: string
}

export type Season = {
  id: number
  name: string
  overview: string
  air_date?: string
  season_number: number
  episode_count?: number
}

export type Episode = {
  id: number
  name?: string
  overview?: string
  air_date: string
  episode_number: number
  season_number: number
  still_path: string
  vote_average: number
  runtime: number
}

export type Genre = {
  name: string
}

export type ImageCollection = {
  posters: Image[]
  backdrops: Image[]
  logos: Image[]
}

export type Image = {
  width: number
  height: number
  aspect_ratio: number
  file_path: string
  vote_average: number
  vote_count: number
  iso_639_1?: string
}

export async function fetchShowsByQuery(
  query: string,
  type: ShowMediaType,
  language: string
): Promise<Show[]> {
  type PageableList<T> = {
    page: number
    total_pages: number
    results: T[]
  }

  const endpoint = new URL(`${API_URL}/search/${type}`)
  endpoint.searchParams.append("query", query)
  endpoint.searchParams.append("include_adult", "false")
  endpoint.searchParams.append("language", language)
  endpoint.searchParams.append("page", "1")
  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch shows for query ${query}`)
  }

  const list: PageableList<Show> = await response.json()
  return list.results
}

export async function fetchShowsFromCollection(
  id: number,
  language?: string
): Promise<CollectionItem[]> {
  type CollectionPage = {
    page: number
    total_pages: number
    items: CollectionItem[]
  }

  async function fetchCollectionPage(page: number): Promise<CollectionPage> {
    const endpoint = new URL(`${API_URL}/list/${id}`)
    endpoint.searchParams.append("language", language ?? "en")
    endpoint.searchParams.append("page", String(page))

    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch collection ${id} page ${page}`)
    }

    return response.json()
  }

  let page = 1
  let totalPages = 1

  const shows = []

  while (page <= totalPages) {
    const data = await fetchCollectionPage(page)
    shows.push(...data.items)
    page++
    totalPages = data.total_pages
  }

  return shows
}

export async function fetchShow(
  id: string,
  type: ShowMediaType,
  language: string
): Promise<Movie | TVSeries> {
  const endpoint = new URL(`${API_URL}/${type}/${id}`)
  endpoint.searchParams.append("language", language)

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch show details for ${type}:${id}`)
  }

  return response.json()
}

export async function fetchSeason(
  id: string,
  season: number,
  language: string
): Promise<Season & { episodes: Episode[] }> {
  const endpoint = new URL(`${API_URL}/tv/${id}/season/${season}`)
  endpoint.searchParams.append("language", language)

  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch season details for ${id} season ${season}`)
  }

  return await response.json()
}

export async function fetchImages(
  id: string,
  type: ShowMediaType,
  language: string,
  additionalLanguages: string[]
): Promise<ImageCollection> {
  const endpoint = new URL(`${API_URL}/${type}/${id}/images`)
  endpoint.searchParams.append("language", language)
  if (additionalLanguages.length > 0) {
    endpoint.searchParams.append(
      "include_image_language",
      additionalLanguages.join(",")
    )
  }
  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch images for ${type}:${id}: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}

export function getImageURL(
  path: string,
  type: "poster" | "backdrop" | "still" | "logo"
): string {
  const sizes: Record<typeof type, string> = {
    poster: "w500",
    logo: "w500",
    backdrop: "w780",
    still: "w300",
  }
  return `${CDN_URL}/${sizes[type]}/${path}`
}

export async function fetchRecommendations(
  id: string,
  type: ShowMediaType,
  language: string
): Promise<Show[]> {
  type PageableList<T> = {
    page: number
    total_pages: number
    results: T[]
  }

  const endpoint = new URL(`${API_URL}/${type}/recommendations`)
  endpoint.searchParams.append("language", language)
  endpoint.searchParams.append("page", "1")
  const response = await fetch(endpoint.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch recommendations for show ID ${id}: ${response.status} - ${response.statusText}`
    )
  }

  const list: PageableList<Show> = await response.json()
  return list.results
}
