import type { JellyfinSession } from "./session.api.ts"
import {
  getGenresApi,
  getItemsApi,
  getLibraryApi,
  getTvShowsApi,
  getUserLibraryApi,
  getUserViewsApi,
} from "@jellyfin/sdk/lib/utils/api"
import type {
  BaseItemDto,
  ItemsApiGetItemsRequest,
  LibraryApiGetSimilarItemsRequest,
  TvShowsApiGetEpisodesRequest,
  TvShowsApiGetSeasonsRequest,
  UserLibraryApiGetItemRequest,
} from "@jellyfin/sdk/lib/generated-client"

export async function fetchUserViews(
  session: JellyfinSession
): Promise<BaseItemDto[]> {
  const response = await getUserViewsApi(session.api).getUserViews({
    userId: session.user.id,
  })

  if (response.data.Items == null) {
    throwFetchError("user views", response)
  }

  return response.data.Items.filter(
    (v) => v.CollectionType == "tvshows" || v.CollectionType == "movies"
  )
}

export async function fetchItem(
  session: JellyfinSession,
  options: {
    itemId: UserLibraryApiGetItemRequest["itemId"]
  }
): Promise<BaseItemDto> {
  const response = await getUserLibraryApi(session.api).getItem({
    itemId: options.itemId,
    userId: session.user.id,
  })

  if (!response.data) {
    throwFetchError("item", response)
  }

  return response.data
}

export async function fetchItems(
  session: JellyfinSession,
  options?: {
    filters?: ItemsApiGetItemsRequest["filters"]
    genreIds?: ItemsApiGetItemsRequest["genreIds"]
    parentId?: ItemsApiGetItemsRequest["parentId"]
    searchTerm?: ItemsApiGetItemsRequest["searchTerm"]
  }
): Promise<BaseItemDto[]> {
  const response = await getItemsApi(session.api).getItems({
    userId: session.user.id,
    recursive: true,
    includeItemTypes: ["Movie", "Series"],
    sortBy: ["Name"],
    sortOrder: ["Descending"],
    enableImageTypes: ["Primary", "Backdrop", "Logo", "Banner"],
    fields: ["Genres", "Overview", "Taglines"],
    filters: options?.filters,
    genreIds: options?.genreIds,
    parentId: options?.parentId,
    searchTerm: options?.searchTerm,
  })

  if (response.data.Items == null) {
    throwFetchError("items", response)
  }

  return response.data.Items
}

export async function fetchGenres(
  session: JellyfinSession
): Promise<BaseItemDto[]> {
  const response = await getGenresApi(session.api).getGenres({
    userId: session.user.id,
    sortBy: ["SortName"],
    sortOrder: ["Ascending"],
    enableTotalRecordCount: false,
    includeItemTypes: ["Movie", "Series"],
  })

  if (response.data.Items == null) {
    throwFetchError("genres", response)
  }

  return response.data.Items
}

export async function fetchSeasons(
  session: JellyfinSession,
  options: {
    seriesId: TvShowsApiGetSeasonsRequest["seriesId"]
  }
): Promise<BaseItemDto[]> {
  const response = await getTvShowsApi(session.api).getSeasons({
    seriesId: options.seriesId,
  })

  if (response.data.Items == null) {
    throwFetchError("seasons", response)
  }

  return response.data.Items.filter((s) => s.IndexNumber)
}

export async function fetchSeasonEpisodes(
  session: JellyfinSession,
  options: {
    seriesId: TvShowsApiGetEpisodesRequest["seriesId"]
    seasonId: TvShowsApiGetEpisodesRequest["seasonId"]
  }
): Promise<BaseItemDto[]> {
  const response = await getTvShowsApi(session.api).getEpisodes({
    seriesId: options.seriesId,
    seasonId: options.seasonId,
    fields: ["Overview"],
    userId: session.user.id,
    sortBy: "IndexNumber",
  })

  if (response.data.Items == null) {
    throwFetchError("episodes", response)
  }

  return response.data.Items
}

export async function fetchSimilarItems(
  session: JellyfinSession,
  options: {
    itemId: LibraryApiGetSimilarItemsRequest["itemId"]
  }
): Promise<BaseItemDto[]> {
  const response = await getLibraryApi(session.api).getSimilarItems({
    userId: session.user.id,
    itemId: options.itemId,
    limit: 12,
  })

  if (response.data.Items == null) {
    throwFetchError("similar items", response)
  }

  return response.data.Items
}

function throwFetchError(
  target: string,
  response: { status: number; statusText: string }
): never {
  throw new Error(
    `Failed to fetch ${target}: ${response.status} - ${response.statusText}`
  )
}
