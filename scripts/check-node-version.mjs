const REQUIRED_NODE_MAJOR = 20

const currentVersion = process.versions.node ?? ""
const parsedMajor = Number.parseInt(currentVersion.split(".")[0] ?? "", 10)

if (parsedMajor !== REQUIRED_NODE_MAJOR) {
  console.error(
    [
      `Unsupported Node.js version: v${currentVersion}`,
      `This project requires Node.js v${REQUIRED_NODE_MAJOR}.x to run Expo scripts reliably.`,
      "",
      "Fix:",
      `1. Install Node.js ${REQUIRED_NODE_MAJOR} LTS if needed.`,
      `2. Run: nvm use ${REQUIRED_NODE_MAJOR}`,
      "3. Re-run: bun run dev",
    ].join("\n"),
  )
  process.exit(1)
}
