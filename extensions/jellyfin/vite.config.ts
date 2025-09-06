import { UserConfig } from "vite"
import teevi from "@teeviapp/vite"

export default {
  plugins: [
    teevi({
      name: "Jellyfin",
      capabilities: ["metadata", "feed", "video"],
      note: `
      Demo Server
      URL: demo.jellyfin.org/stable
      Username: demo
      `,
      inputs: [
        { id: "server", name: "Server URL", required: true },
        { id: "username", name: "Username", required: true },
        { id: "password", name: "Password", required: false },
      ],
    }),
  ],
} satisfies UserConfig
