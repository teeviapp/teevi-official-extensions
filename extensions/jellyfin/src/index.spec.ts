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
        server: "demo.jellyfin.org/stable",
        username: "demo",
        password: "",
      }
      return mockConfig[id]
    }),
  }

  vi.stubGlobal("Teevi", mockTeevi)
})

test("should fetch a show", async () => {
  const shows = await extension.fetchShowsByQuery("dracula")
  expect(shows).toBeDefined()
  expect(shows.length).toBeGreaterThan(0)
  console.log("Search Results =>", shows)
  const show = await extension.fetchShow(shows[0].id)
  expect(show).toBeDefined()
  console.log("First Show Details =>", show)
  const videoAssets = await extension.fetchVideoAssets(show.id)
  expect(videoAssets).toBeDefined()
  console.log("Video Assets =>", videoAssets)
}, 10000)
