import { UserConfig } from "vite"
import teevi from "@teeviapp/vite"

export default {
  plugins: [
    teevi({
      name: "The Movie Database",
      capabilities: ["metadata"],
      inputs: [
        { id: "api.token", name: "API Read Access Token", required: true },
      ],
      note: "To register for an API key, click the [API link](https://www.themoviedb.org/settings/api) from within your account settings page",
    }),
  ],
} satisfies UserConfig
