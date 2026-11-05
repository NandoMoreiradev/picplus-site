import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenAI } from '@google/genai';
import {
  DEFAULT_AI_MODEL,
  DEFAULT_AI_PERSONA_NAME,
  DEFAULT_AI_SYSTEM_PROMPT,
} from './ai-chatbot.constants';
import {
  TestAiChatbotPromptDto,
  UpdateAiChatbotConfigDto,
} from './dto/update-ai-config.dto';
import { AiChatbotConfig } from '@prisma/client';

export interface AiProcessResult {
  responseText: string;
  shouldHandoff: boolean;
  handoffReason?: string;
}

@Injectable()
export class AiChatbotService {
  private readonly logger = new Logger(AiChatbotService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtém as configurações ativas do chatbot com IA (ou inicializa os padrões).
   */
  async getConfig(): Promise<AiChatbotConfig> {
    const existing = await this.prisma.aiChatbotConfig.findUnique({
      where: { id: 'default' },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.aiChatbotConfig.create({
      data: {
        id: 'default',
        isActive: true,
        personaName: DEFAULT_AI_PERSONA_NAME,
        systemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
        geminiModel: DEFAULT_AI_MODEL,
        temperature: 0.7,
        autoHandoff: true,
        autoHandoffKeywords: [
          'atendente',
          'humano',
          'atendimento',
          'pessoa',
          'falar com alguem',
          'consultor',
          'especialista',
        ],
        maxMessagesBeforeHandoff: 15,
        businessHoursOnly: false,
      },
    });
  }

  /**
   * Atualiza as configurações do chatbot com IA.
   */
  async updateConfig(dto: UpdateAiChatbotConfigDto): Promise<AiChatbotConfig> {
    await this.getConfig(); // garante existência do default

    return this.prisma.aiChatbotConfig.update({
      where: { id: 'default' },
      data: dto,
    });
  }

  /**
   * Inicializa o cliente do Google Gen AI.
   */
  private getGenAIClient(config: AiChatbotConfig): GoogleGenAI {
    const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Chave da API do Google Gemini não configurada (defina GEMINI_API_KEY no .env ou nas configurações do painel).',
      );
    }
    return new GoogleGenAI({ apiKey });
  }

  /**
   * Processa uma mensagem recebida do usuário e gera a resposta da IA.
   */
  async processInboundMessage(
    conversationId: string,
    userMessageText: string,
  ): Promise<AiProcessResult | null> {
    const config = await this.getConfig();

    if (!config.isActive) {
      this.logger.debug('[AI Chatbot] IA desativada nas configurações.');
      return null;
    }

    // 1. Verificar palavras-chave explícitas de solicitação de atendente
    const normalizedUserMsg = userMessageText.toLowerCase();
    if (config.autoHandoff && config.autoHandoffKeywords?.length) {
      const matchedKeyword = config.autoHandoffKeywords.find((kw) =>
        normalizedUserMsg.includes(kw.toLowerCase()),
      );

      if (matchedKeyword) {
        this.logger.log(
          `[AI Chatbot] Gatilho de palavra-chave detectado: "${matchedKeyword}". Transferindo para humano.`,
        );
        return {
          responseText:
            'Com certeza! Estou transferindo seu atendimento para um de nossos especialistas da equipe PicPlus. Um instante por favor!',
          shouldHandoff: true,
          handoffReason: `Cliente solicitou atendimento humano (palavra-chave: "${matchedKeyword}")`,
        };
      }
    }

    // 2. Carregar histórico da conversa
    const messages = await this.prisma.whatsappMessage.findMany({
      where: {
        conversationId,
        type: 'TEXT',
      },
      orderBy: { sentAt: 'asc' },
      take: 20,
    });

    // Se ultrapassou o teto de mensagens da IA sem resolução, sugere handoff
    if (
      config.maxMessagesBeforeHandoff &&
      messages.length >= config.maxMessagesBeforeHandoff
    ) {
      this.logger.log(
        `[AI Chatbot] Limite de ${config.maxMessagesBeforeHandoff} mensagens atingido. Solicitando handoff.`,
      );
      return {
        responseText:
          'Para garantir o melhor atendimento para você, vou conectar você agora mesmo a um dos nossos consultores da PicPlus. Um momento!',
        shouldHandoff: true,
        handoffReason: `Limite de mensagens do bot atingido (${config.maxMessagesBeforeHandoff} mensagens).`,
      };
    }

    // 3. Montar histórico formatado para o Gemini
    const contents: Array<{
      role: 'user' | 'model';
      parts: Array<{ text: string }>;
    }> = [];

    for (const msg of messages) {
      if (!msg.content?.trim()) continue;
      const role = msg.direction === 'INBOUND' ? 'user' : 'model';
      contents.push({
        role,
        parts: [{ text: msg.content }],
      });
    }

    // Se a mensagem atual ainda não foi adicionada aos contents (caso tenha acabado de ser criada), garantir presença
    if (
      contents.length === 0 ||
      contents[contents.length - 1].parts[0].text !== userMessageText
    ) {
      contents.push({
        role: 'user',
        parts: [{ text: userMessageText }],
      });
    }

    // 4. Executar chamada à API do Gemini
    try {
      const ai = this.getGenAIClient(config);
      const model = config.geminiModel || DEFAULT_AI_MODEL;

      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: config.systemPrompt || DEFAULT_AI_SYSTEM_PROMPT,
          temperature: config.temperature ?? 0.7,
        },
      });

      const rawText = response.text || '';
      let cleanText = rawText;
      let shouldHandoff = false;
      let handoffReason: string | undefined;

      // 5. Analisar se a IA solicitou handoff através da tag [HANDOFF: ...]
      const handoffRegex = /\[HANDOFF:\s*(.*?)\]/i;
      const match = rawText.match(handoffRegex);

      if (match) {
        shouldHandoff = true;
        handoffReason = match[1]?.trim() || 'Solicitação identificada pela IA';
        cleanText = rawText.replace(handoffRegex, '').trim();
      }

      return {
        responseText: cleanText,
        shouldHandoff,
        handoffReason,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `[AI Chatbot] Erro ao consultar Gemini: ${err.message}`,
        err.stack,
      );
      return null;
    }
  }

  /**
   * Testa um prompt de forma isolada para validação no painel administrativo.
   */
  async testPrompt(dto: TestAiChatbotPromptDto): Promise<string> {
    const config = await this.getConfig();
    const ai = this.getGenAIClient(config);
    const model = dto.geminiModel || config.geminiModel || DEFAULT_AI_MODEL;
    const systemPrompt =
      dto.systemPrompt || config.systemPrompt || DEFAULT_AI_SYSTEM_PROMPT;

    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: dto.message }] }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    return response.text || '(Sem resposta da IA)';
  }
}
