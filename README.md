# Suno MCP Server

A Model Context Protocol (MCP) server for [Suno AI](https://suno.ai) music generation. Use natural language to create, extend, and manage AI-generated music through any MCP-compatible client like Claude Desktop.

## Features

- **Generate Music** - Create songs from text descriptions
- **Custom Generation** - Full control with custom lyrics, tags, and titles  
- **Extend Audio** - Make songs longer or add sections
- **Generate Lyrics** - Create lyrics before generating music
- **Stem Separation** - Split audio into vocals, instruments, drums
- **Word-Level Timestamps** - Get precise lyric timing for karaoke/subtitles
- **Credit Management** - Check remaining credits before generating
- **Download Tracks** - Save your music locally with the included Python script
- **List & Query** - Browse all your generated music

## Available Tools

| Tool | Description |
|------|-------------|
| `suno_generate` | Generate music from a text prompt (2 variants, 10 credits) |
| `suno_custom_generate` | Generate with custom lyrics, tags, and title |
| `suno_generate_lyrics` | Create lyrics from a text description |
| `suno_extend_audio` | Extend an existing audio clip |
| `suno_concat` | Concatenate clips into a full song |
| `suno_generate_stems` | Separate audio into stem tracks |
| `suno_get_audio` | Get audio info by IDs or list all music |
| `suno_get_clip` | Get detailed clip information |
| `suno_get_limit` | Check credits and usage limits |
| `suno_get_aligned_lyrics` | Get word-level lyric timestamps |
| `suno_get_persona` | Get persona/artist style information |
| `suno_download` | Get download links for tracks |

## Installation

```bash
# Clone the repository
git clone https://github.com/alxTools/suno-mcp-server.git
cd suno-mcp-server

# Install dependencies
npm install

# Build the server
npm run build
```

## Configuration

Set the `SUNO_API_URL` environment variable to point to your suno-api instance:

```bash
# Default: http://localhost:3000
export SUNO_API_URL=http://localhost:3000

# Or for a remote instance:
export SUNO_API_URL=https://suno.alxtools.com
```

## Usage with Claude Desktop

Add to your Claude Desktop config:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "suno": {
      "command": "node",
      "args": ["/path/to/suno-mcp-server/dist/index.js"],
      "env": {
        "SUNO_API_URL": "https://suno.alxtools.com"
      }
    }
  }
}
```

## Usage with Other MCP Clients

### Using npx (when published)
```bash
npx @alxtools/suno-mcp-server
```

### Using the binary directly
```bash
# After building
node dist/index.js

# Or globally
npm link
suno-mcp-server
```

## Example Natural Language Interactions

Once connected, you can use natural language:

- "Generate a relaxing lo-fi beat for studying"
- "Create a rock song about space exploration with custom lyrics"
- "Check how many credits I have left"
- "Extend my song abc123 by 30 seconds"
- "Generate stems for my latest track"
- "Get word timestamps for my song for subtitles"
- "List all my generated music"
- "Download all my tracks to ./my-music"

## Download Script

The included Python script makes it easy to download your tracks:

```bash
# Download a single track
python3 download_suno.py abc123

# Download all tracks
python3 download_suno.py --all ./my-music

# Download from a list
python3 download_suno.py --batch ids.txt ./downloads
```

## Prerequisites

You need a running [suno-api](https://github.com/gcui-art/suno-api) instance which handles:
- Suno authentication (cookies)
- hCaptcha solving (2Captcha)
- Audio generation via Suno.ai

## Development

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

- GitHub Issues: [github.com/alxTools/suno-mcp-server/issues](https://github.com/alxTools/suno-mcp-server/issues)
- Original API: [github.com/gcui-art/suno-api](https://github.com/gcui-art/suno-api)