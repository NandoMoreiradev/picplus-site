import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AiChatbotService } from '../ai-chatbot/ai-chatbot.service';

/** Formatos de áudio aceitos pelo Gemini. */
const AUDIO_MIMES = new Set([
  'audio/wav',
  'audio/x-wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
  'audio/aiff',
  'audio/webm',
  'audio/mp4',
]);

const TRANSCRIBE_PROMPT = `Transcreva fielmente este áudio em português do Brasil.
Regras:
- Devolva SOMENTE a transcrição, sem comentários, títulos ou aspas.
- Pontue corretamente e separe em parágrafos curtos quando houver mudança de assunto.
- Remova apenas vícios de fala óbvios (hã, ééé) e repetições acidentais; não resuma nem altere o sentido.
- Se não houver fala compreensível, devolva exatamente: [sem fala]`;

const IMPROVE_PROMPT = `Você revisa textos de comentários em uma ferramenta de gestão de tarefas de uma agência de marketing.
Reescreva o texto abaixo para ficar claro, objetivo e profissional, em português do Brasil.
Regras:
- Preserve o sentido, os nomes, números, datas e links; não invente informações.
- Corrija gramática, pontuação e organize em parágrafos curtos (ou lista, se houver passos/itens).
- Mantenha o tom natural de um colega de equipe, sem exageros.
- Devolva SOMENTE o texto final, sem explicações nem aspas.`;

type GeminiClient = Awaited<ReturnType<AiChatbotService['getClient']>>;

/** Texto limpo vindo da IA (remove cercas de código que o modelo às vezes coloca). */
const clean = (text?: string | null) =>
  (text ?? '')
    .trim()
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/\n?```$/, '')
    .trim();

@Injectable()
export class TaskAiService {
  private readonly logger = new Logger(TaskAiService.name);

  constructor(private readonly gemini: AiChatbotService) {}

  async transcribe(file: Express.Multer.File) {
    const mimeType = (file.mimetype || '').split(';')[0].trim().toLowerCase();
    if (!AUDIO_MIMES.has(mimeType)) {
      throw new BadRequestException('Formato de áudio não suportado.');
    }
    if (file.size < 1000) {
      throw new BadRequestException('O áudio está vazio ou muito curto.');
    }
    const text = await this.run(({ ai, model }) =>
      ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: { mimeType, data: file.buffer.toString('base64') },
              },
              { text: TRANSCRIBE_PROMPT },
            ],
          },
        ],
        config: { temperature: 0 },
      }),
    );
    return { text: text === '[sem fala]' ? '' : text };
  }

  async improve(text: string) {
    const improved = await this.run(({ ai, model }) =>
      ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text }] }],
        config: { systemInstruction: IMPROVE_PROMPT, temperature: 0.3 },
      }),
    );
    return { text: improved || text };
  }

  private async run(
    call: (client: GeminiClient) => Promise<{ text?: string }>,
  ): Promise<string> {
    let client: GeminiClient;
    try {
      client = await this.gemini.getClient();
    } catch (error) {
      // Chave ausente: mensagem útil para quem administra.
      throw new BadRequestException((error as Error).message);
    }
    try {
      return clean((await call(client)).text);
    } catch (error) {
      this.logger.error(`Falha no Gemini: ${(error as Error).message}`);
      throw new BadGatewayException(
        'Não foi possível processar com a IA agora. Tente novamente.',
      );
    }
  }
}
