import { defineConfig } from "vite"
import teevi from "@teeviapp/vite"

export default defineConfig({
  plugins: [
    teevi({
      name: "Live TV Italia",
      capabilities: ["live"],
      note: "Live TV Italia garantisce l'accesso solo ai canali tv disponibili gratuitamente e legalmente tramite il repository su GitHub [Free-TV](https://github.com/Free-TV/IPTV)",
    }),
  ],
})
