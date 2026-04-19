#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { SunoApiClient, formatAudioInfo, formatQuotaInfo } from './client.js';

const apiBaseUrl = process.env.SUNO_API_URL || 'http://localhost:3000';
const client = new SunoApiClient(apiBaseUrl);

const tools: Tool[] = [
  {
    name: 'suno_generate',
    description: 'Generate music from a text prompt. Creates 2 audio variants (10 credits). Set wait_audio=true to wait for completion (up to 100s), or false to get task IDs to poll later.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Text description of the desired music (e.g., "A soothing piano ballad about rainy days")' },
        make_instrumental: { type: 'boolean', description: 'Whether to generate instrumental music without vocals' },
        model: { type: 'string', description: 'Model name: chirp-v3-5 (default) or chirp-v3-0' },
        wait_audio: { type: 'boolean', description: 'Wait for audio generation to complete (true) or return immediately (false)' },
      },
      required: ['prompt', 'make_instrumental', 'wait_audio'],
    },
  },
  {
    name: 'suno_custom_generate',
    description: 'Generate music with custom lyrics, tags, and title. Creates 2 audio variants (10 credits). Provides full control over the creative direction.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Lyrics or detailed prompt for the music' },
        tags: { type: 'string', description: 'Music genre/style tags (e.g., "pop, electronic, upbeat")' },
        title: { type: 'string', description: 'Song title' },
        negative_tags: { type: 'string', description: 'Tags to exclude from generation' },
        make_instrumental: { type: 'boolean', description: 'Whether to generate instrumental music without vocals' },
        model: { type: 'string', description: 'Model name: chirp-v3-5 (default) or chirp-v3-0' },
        wait_audio: { type: 'boolean', description: 'Wait for audio generation to complete (true) or return immediately (false)' },
      },
      required: ['prompt', 'tags', 'title'],
    },
  },
  {
    name: 'suno_generate_lyrics',
    description: 'Generate lyrics based on a text prompt. Useful for creating custom lyrics before generating music.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Description of desired lyrics (e.g., "A love song about stargazing on a summer night")' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'suno_extend_audio',
    description: 'Extend an existing audio clip by generating additional content. Useful for making a song longer or adding new sections.',
    inputSchema: {
      type: 'object',
      properties: {
        audio_id: { type: 'string', description: 'The ID of the audio clip to extend' },
        prompt: { type: 'string', description: 'Lyrics/prompt for the extension' },
        continue_at: { type: 'string', description: 'Timestamp to continue from (e.g., "109.96"). Default extends from end.' },
        tags: { type: 'string', description: 'Music genre/style tags' },
        negative_tags: { type: 'string', description: 'Tags to exclude' },
        title: { type: 'string', description: 'Song title' },
        model: { type: 'string', description: 'Model name: chirp-v3-5 (default) or chirp-v3-0' },
        wait_audio: { type: 'boolean', description: 'Wait for generation to complete' },
      },
      required: ['audio_id'],
    },
  },
  {
    name: 'suno_concat',
    description: 'Generate a complete song by concatenating audio clip extensions. Takes a clip ID and produces the full song.',
    inputSchema: {
      type: 'object',
      properties: {
        clip_id: { type: 'string', description: 'The ID of the clip to concatenate into a full song' },
      },
      required: ['clip_id'],
    },
  },
  {
    name: 'suno_generate_stems',
    description: 'Separate audio into individual stem tracks (e.g., vocals, instruments, drums). Useful for remixing or analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        audio_id: { type: 'string', description: 'The ID of the song to generate stems for' },
      },
      required: ['audio_id'],
    },
  },
  {
    name: 'suno_get_audio',
    description: 'Get information about audio clips by their IDs. Returns status, URLs, metadata. If no IDs provided, lists all your music.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: { type: 'string', description: 'Comma-separated audio IDs (e.g., "abc123,def456"). Omit to list all music.' },
        page: { type: 'number', description: 'Page number for pagination when listing all music' },
      },
      required: [],
    },
  },
  {
    name: 'suno_get_clip',
    description: 'Get detailed information about a specific clip by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The clip ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'suno_get_limit',
    description: 'Get your current Suno API credits and usage limits. Check remaining credits before generating.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'suno_get_aligned_lyrics',
    description: 'Get word-level lyric alignment with timestamps for a song. Returns each word with start/end times.',
    inputSchema: {
      type: 'object',
      properties: {
        song_id: { type: 'string', description: 'The song ID to get aligned lyrics for' },
      },
      required: ['song_id'],
    },
  },
  {
    name: 'suno_get_persona',
    description: 'Get information about a persona (artist style/voice) including associated clips.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The persona ID' },
        page: { type: 'number', description: 'Page number for pagination' },
      },
      required: ['id'],
    },
  },
  {
    name: 'suno_download',
    description: 'Get download links for audio tracks. Returns direct download URLs and commands to save files locally. Supports single tracks or batch download.',
    inputSchema: {
      type: 'object',
      properties: {
        audio_ids: { type: 'string', description: 'Comma-separated audio IDs to download (e.g., "abc123,def456"). Use "all" to download everything.' },
        output_dir: { type: 'string', description: 'Directory to save files (default: ./suno-downloads)' },
      },
      required: ['audio_ids'],
    },
  },
];

const server = new Server(
  {
    name: 'suno-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'suno_generate': {
        const { prompt, make_instrumental, model, wait_audio } = args as any;
        const result = await client.generate(prompt, make_instrumental, model, wait_audio);
        return {
          content: [
            {
              type: 'text',
              text: `Generated ${result.length} audio clip(s):\n\n${result.map(formatAudioInfo).join('\n\n')}`,
            },
          ],
        };
      }

      case 'suno_custom_generate': {
        const { prompt, tags, title, negative_tags, make_instrumental, model, wait_audio } = args as any;
        const result = await client.customGenerate(
          prompt, tags, title, negative_tags, make_instrumental, model, wait_audio
        );
        return {
          content: [
            {
              type: 'text',
              text: `Generated ${result.length} audio clip(s):\n\n${result.map(formatAudioInfo).join('\n\n')}`,
            },
          ],
        };
      }

      case 'suno_generate_lyrics': {
        const { prompt } = args as any;
        const result = await client.generateLyrics(prompt);
        return {
          content: [
            {
              type: 'text',
              text: `**Generated Lyrics: "${result.title}"**\n\nStatus: ${result.status}\n\n${result.text}`,
            },
          ],
        };
      }

      case 'suno_extend_audio': {
        const { audio_id, prompt, continue_at, tags, negative_tags, title, model, wait_audio } = args as any;
        const result = await client.extendAudio(audio_id, prompt, continue_at, tags, negative_tags, title, model, wait_audio);
        return {
          content: [
            {
              type: 'text',
              text: `Extended audio:\n\n${result.map(formatAudioInfo).join('\n\n')}`,
            },
          ],
        };
      }

      case 'suno_concat': {
        const { clip_id } = args as any;
        const result = await client.concat(clip_id);
        return {
          content: [
            {
              type: 'text',
              text: `Concatenated song:\n\n${formatAudioInfo(result)}`,
            },
          ],
        };
      }

      case 'suno_generate_stems': {
        const { audio_id } = args as any;
        const result = await client.generateStems(audio_id);
        return {
          content: [
            {
              type: 'text',
              text: `Generated ${result.length} stem track(s):\n\n${result.map(formatAudioInfo).join('\n\n')}`,
            },
          ],
        };
      }

      case 'suno_get_audio': {
        const { ids, page } = args as any;
        const result = await client.getAudio(ids, page);
        return {
          content: [
            {
              type: 'text',
              text: `Found ${result.length} audio clip(s):\n\n${result.map(formatAudioInfo).join('\n\n')}`,
            },
          ],
        };
      }

      case 'suno_get_clip': {
        const { id } = args as any;
        const result = await client.getClip(id);
        return {
          content: [
            {
              type: 'text',
              text: `**Clip Details**\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``,
            },
          ],
        };
      }

      case 'suno_get_limit': {
        const result = await client.getLimit();
        return {
          content: [
            {
              type: 'text',
              text: formatQuotaInfo(result),
            },
          ],
        };
      }

      case 'suno_get_aligned_lyrics': {
        const { song_id } = args as any;
        const result = await client.getAlignedLyrics(song_id);
        const formatted = result.map((w) => `${w.word}: ${w.start_s}s - ${w.end_s}s`).join('\n');
        return {
          content: [
            {
              type: 'text',
              text: `**Word-Level Lyrics for ${song_id}**\n\n${formatted}`,
            },
          ],
        };
      }

      case 'suno_get_persona': {
        const { id, page } = args as any;
        const result = await client.getPersona(id, page);
        return {
          content: [
            {
              type: 'text',
              text: `**Persona: ${result.persona.name}**\n- Description: ${result.persona.description}\n- Clips: ${result.persona.clip_count}\n- Public: ${result.persona.is_public}\n- Page: ${result.current_page} of ${Math.ceil(result.total_results / 20)}`,
            },
          ],
        };
      }

      case 'suno_download': {
        const { audio_ids, output_dir = './suno-downloads' } = args as any;
        
        if (audio_ids === 'all') {
          const tracks = await client.getAudio();
          if (!tracks || tracks.length === 0) {
            return {
              content: [{ type: 'text', text: 'No tracks found in your library.' }],
            };
          }
          
          const trackList = tracks.map(t => ({
            id: t.id,
            title: t.title,
            audio_url: t.audio_url,
            cover_url: t.image_url
          }));
          
          return {
            content: [
              {
                type: 'text',
                text: `**Download All Tracks (${tracks.length} found)**\n\n` +
                  trackList.map(t => `**${t.title}**\n- ID: \`${t.id}\`\n- Audio: ${t.audio_url}\n- Cover: ${t.cover_url}`).join('\n\n') +
                  `\n\n**To download all tracks, run:**\n\`\`\`bash\n` +
                  `python3 download_suno.py --all ${output_dir}\n` +
                  `\`\`\`\n\n` +
                  `**Or download specific tracks:**\n\`\`\`bash\n` +
                  `python3 download_suno.py ${tracks[0].id} ${output_dir}\n` +
                  `\`\`\``
              },
            ],
          };
        }
        
        const ids = audio_ids.split(',').map((id: string) => id.trim());
        const tracks = await client.getAudio(audio_ids);
        
        if (!tracks || tracks.length === 0) {
          return {
            content: [{ type: 'text', text: `No tracks found for IDs: ${audio_ids}` }],
          };
        }
        
        const downloadInfo = tracks.map(t => ({
          title: t.title,
          id: t.id,
          audio_url: t.audio_url,
          cover_url: t.image_url,
          command: `python3 download_suno.py ${t.id} ${output_dir}`
        }));
        
        return {
          content: [
            {
              type: 'text',
              text: `**Download Ready**\n\n` +
                downloadInfo.map((t: any) => `**${t.title}**\n- ID: \`${t.id}\`\n- Audio: ${t.audio_url}\n- Cover: ${t.cover_url}`).join('\n\n') +
                `\n\n**Quick Download Commands:**\n` +
                downloadInfo.map((t: any) => `\`\`\`bash\n${t.command}\n\`\`\``).join('\n\n') +
                `\n\n**Or download all at once:**\n\`\`\`bash\n` +
                `python3 download_suno.py ${ids.join(' ')} ${output_dir}\n` +
                `\`\`\``
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
    const statusCode = error.response?.status;
    
    return {
      content: [
        {
          type: 'text',
          text: `Error${statusCode ? ` (${statusCode})` : ''}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Suno MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});