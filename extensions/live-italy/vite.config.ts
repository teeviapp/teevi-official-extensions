import { defineConfig } from "vite"
import teevi from "@teeviapp/vite"

export default defineConfig({
  plugins: [
    teevi({
      name: "Live TV Italia",
      capabilities: ["live"],
      note: "Solo canali TV gratuiti e legali dal repository [Free-TV](https://github.com/Free-TV/IPTV)",
    }),
  ],
})
