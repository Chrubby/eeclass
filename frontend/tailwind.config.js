/** @type {import('tailwindcss').Config} */
export default {
  // relative: true 讓路徑以本設定檔為準，不受執行 build 時所在目錄影響
  content: {
    relative: true,
    files: [
      "./index.html",
      "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
  },
  theme: {
    extend: {},
  },
  plugins: [],
}
