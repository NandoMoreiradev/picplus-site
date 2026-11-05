import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

interface MetaSendMessageResponse {
  messages?: Array<{ id: string }>;
}

interface MetaMediaResponse {
  url?: string;
}

@Injectable()
export class MetaApiService {
  private readonly logger = new Logger(MetaApiService.name);
  private readonly baseUrl = 'https://graph.facebook.com/v21.0';

  constructor(private readonly http: HttpService) {}

  /**
   * Envia mensagem de texto simples para um número de WhatsApp via Meta Cloud API.
   */
  async sendTextMessage(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    text: string,
  ): Promise<{ messageId: string } | null> {
    const url = `${this.baseUrl}/${phoneNumberId}/messages`;
    const cleanTo = to.replace(/\D/g, '');

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanTo,
      type: 'text',
      text: {
        preview_url: true,
        body: text,
      },
    };

    try {
      const response = await firstValueFrom(
        this.http.post<MetaSendMessageResponse>(url, payload, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const messageId = response.data?.messages?.[0]?.id || '';
      return { messageId };
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { error?: unknown } };
        message?: string;
      };
      const details =
        err.response?.data?.error || err.message || 'Erro desconhecido';
      this.logger.error(
        `[Meta API] Falha ao enviar mensagem para ${cleanTo}: ${JSON.stringify(details)}`,
      );
      throw new Error(
        `Falha no envio pelo WhatsApp: ${JSON.stringify(details)}`,
      );
    }
  }

  /**
   * Marca uma mensagem recebida como lida na Meta.
   */
  async markAsRead(
    phoneNumberId: string,
    accessToken: string,
    messageId: string,
  ): Promise<boolean> {
    const url = `${this.baseUrl}/${phoneNumberId}/messages`;

    try {
      await firstValueFrom(
        this.http.post(
          url,
          {
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageId,
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      return true;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.warn(
        `[Meta API] Falha ao marcar mensagem ${messageId} como lida: ${err.message}`,
      );
      return false;
    }
  }

  /**
   * Obtém a URL de download de uma mídia recebida via ID da Meta.
   */
  async getMediaUrl(
    mediaId: string,
    accessToken: string,
  ): Promise<string | null> {
    const url = `${this.baseUrl}/${mediaId}`;

    try {
      const response = await firstValueFrom(
        this.http.get<MetaMediaResponse>(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );
      return response.data?.url || null;
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `[Meta API] Falha ao consultar URL da mídia ${mediaId}: ${err.message}`,
      );
      return null;
    }
  }
}
