import axios, { AxiosInstance } from 'axios';

export interface AudioInfo {
  id: string;
  title: string;
  image_url: string;
  lyric: string;
  audio_url: string;
  video_url: string;
  created_at: string;
  model_name: string;
  status: string;
  gpt_description_prompt: string;
  prompt: string;
  type: string;
  tags: string;
  negative_tags: string;
  duration: string;
  error_message?: string;
  stem_from_id?: string;
}

export interface QuotaInfo {
  credits_left: number;
  period: string;
  monthly_limit: number;
  monthly_usage: number;
}

export interface LyricResult {
  text: string;
  title: string;
  status: string;
}

export interface WordAlignment {
  word: string;
  start_s: number;
  end_s: number;
  success: boolean;
  p_align: number;
}

export interface PersonaResponse {
  persona: {
    id: string;
    name: string;
    description: string;
    image_s3_id: string;
    root_clip_id: string;
    clip: any;
    persona_clips: any[];
    is_suno_persona: boolean;
    is_public: boolean;
    upvote_count: number;
    clip_count: number;
  };
  total_results: number;
  current_page: number;
  is_following: boolean;
}

export class SunoApiClient {
  private client: AxiosInstance;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 120000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async generate(prompt: string, make_instrumental: boolean, model?: string, wait_audio?: boolean): Promise<AudioInfo[]> {
    const response = await this.client.post('/api/generate', {
      prompt,
      make_instrumental,
      model,
      wait_audio,
    });
    return response.data;
  }

  async customGenerate(
    prompt: string,
    tags: string,
    title: string,
    negative_tags?: string,
    make_instrumental?: boolean,
    model?: string,
    wait_audio?: boolean
  ): Promise<AudioInfo[]> {
    const response = await this.client.post('/api/custom_generate', {
      prompt,
      tags,
      title,
      negative_tags,
      make_instrumental,
      model,
      wait_audio,
    });
    return response.data;
  }

  async extendAudio(
    audio_id: string,
    prompt?: string,
    continue_at?: string,
    tags?: string,
    negative_tags?: string,
    title?: string,
    model?: string,
    wait_audio?: boolean
  ): Promise<AudioInfo[]> {
    const response = await this.client.post('/api/extend_audio', {
      audio_id,
      prompt,
      continue_at,
      tags,
      negative_tags,
      title,
      model,
      wait_audio,
    });
    return response.data;
  }

  async concat(clip_id: string): Promise<AudioInfo> {
    const response = await this.client.post('/api/concat', { clip_id });
    return response.data;
  }

  async generateStems(audio_id: string): Promise<AudioInfo[]> {
    const response = await this.client.post('/api/generate_stems', { audio_id });
    return response.data;
  }

  async generateLyrics(prompt: string): Promise<LyricResult> {
    const response = await this.client.post('/api/generate_lyrics', { prompt });
    return response.data;
  }

  async getAudio(ids?: string, page?: number): Promise<AudioInfo[]> {
    const params: any = {};
    if (ids) params.ids = ids;
    if (page !== undefined) params.page = page;
    const response = await this.client.get('/api/get', { params });
    return response.data;
  }

  async getClip(id: string): Promise<any> {
    const response = await this.client.get('/api/clip', { params: { id } });
    return response.data;
  }

  async getLimit(): Promise<QuotaInfo> {
    const response = await this.client.get('/api/get_limit');
    return response.data;
  }

  async getAlignedLyrics(song_id: string): Promise<WordAlignment[]> {
    const response = await this.client.get('/api/get_aligned_lyrics', { params: { song_id } });
    return response.data;
  }

  async getPersona(id: string, page?: number): Promise<PersonaResponse> {
    const params: any = { id };
    if (page !== undefined) params.page = page;
    const response = await this.client.get('/api/persona', { params });
    return response.data;
  }
}

export function formatAudioInfo(audio: AudioInfo): string {
  return `**${audio.title}**
- ID: \`${audio.id}\`
- Status: ${audio.status}
- Duration: ${audio.duration}
- Tags: ${audio.tags || 'N/A'}
- Audio: ${audio.audio_url || 'N/A'}
- Video: ${audio.video_url || 'N/A'}
- Cover: ${audio.image_url || 'N/A'}
${audio.error_message ? `- Error: ${audio.error_message}` : ''}`;
}

export function formatQuotaInfo(quota: QuotaInfo): string {
  return `**Credits:** ${quota.credits_left} remaining
- Period: ${quota.period}
- Monthly Limit: ${quota.monthly_limit}
- Monthly Usage: ${quota.monthly_usage}`;
}