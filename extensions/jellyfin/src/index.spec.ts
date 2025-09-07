import { test, beforeEach, vi, expect } from "vitest"
import extension from "./index"
import { type TeeviRuntime } from "@teeviapp/core"

beforeEach(() => {
  // Mock the global Teevi object
  const mockTeevi: TeeviRuntime = {
    language: "en",

    getInputValueById: vi.fn((id: string) => {
      // Mock configuration values - customize as needed
      const mockConfig: Record<string, string> = {
        server: "localhost",
        username: "manu",
        password: "cate15",
      }
      return mockConfig[id]
    }),
  }

  vi.stubGlobal("Teevi", mockTeevi)
})

test("should fetch a show", async () => {
  const collections = await extension.fetchFeedCollections()
  const firstShow = collections.filter((c) => c.category == "series")[0]
    .shows[0]
  expect(firstShow).toBeDefined()
  if (firstShow.kind == "movie") {
    const video = await extension.fetchVideoAssets(firstShow.id)
    console.log("Video assets for movie:", video)
  } else if (firstShow.kind == "series") {
    const details = await extension.fetchShow(firstShow.id)
    console.log("Show details:", details)
    const episodes = await extension.fetchEpisodes(
      firstShow.id,
      details.seasons![0].number
    )
    const video = await extension.fetchVideoAssets(episodes[1].id)
    console.log("Video assets for series:", video)
  }

  console.log(collections)
}, 10000)
