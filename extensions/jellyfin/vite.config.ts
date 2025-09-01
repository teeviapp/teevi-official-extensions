import { UserConfig } from "vite"
import teevi from "@teeviapp/vite"

export default {
  plugins: [
    teevi({
      name: "Jellyfin",
      capabilities: ["metadata", "feed", "video"],
      note: 'You can use the demo server at "demo.jellyfin.org/stable" with username "demo" to explore the extension’s features',
      inputs: [
        { id: "server", name: "Server URL", required: true },
        { id: "username", name: "Username", required: true },
        { id: "password", name: "Password", required: false },
      ],
    }),
  ],
} satisfies UserConfig
