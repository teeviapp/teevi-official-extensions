import { describe, it, expect } from "vitest"
import ext from "./index"

describe("Live Extension Tests", () => {
  it("should return a list of channels", async () => {
    const channels = await ext.fetchLiveChannels()
    expect(channels).toBeInstanceOf(Array)
    expect(channels.length).toBeGreaterThan(0)
  })

  it("should return a list of programs", async () => {
    const start = new Date()
    const end = new Date(start.getTime() + 60 * 60 * 1000) // Add 1 hour using milliseconds
    const programs = await ext.fetchChannelPrograms(
      start.toISOString(),
      end.toISOString()
    )
    expect(programs).toBeInstanceOf(Array)
  })

  it("should return a video asset", async () => {
    const asset = await ext.fetchLiveVideoAsset("Rai1.it")
    expect(asset).toBeDefined()
    expect(asset).toHaveProperty("url")
  })
})
