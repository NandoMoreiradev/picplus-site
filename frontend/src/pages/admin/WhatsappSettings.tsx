import { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  Bot,
  Copy,
  Check,
  Save,
  Sparkles,
  Send,
  Radio,
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { whatsappApi } from '../../lib/whatsapp';
import type {
  WhatsappChannel,
  AiChatbotConfig,
  AiModelOption,
} from '../../lib/whatsapp';
import { API_URL } from '../../lib/api';

type Tab = 'CONNECTION' | 'AI';

export default function WhatsappSettings() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('CONNECTION');
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Estados de Conexão WhatsApp
  const [channel, setChannel] = useState<WhatsappChannel>({
    phoneNumberId: '',
    wabaId: '',
    phoneNumber: '',
    accessToken: '',
    verifyToken: 'picplus_secret_verify_token',
    isActive: true,
  });
  const [isSavingChannel, setIsSavingChannel] = useState(false);

  // Estados da IA
  const [aiConfig, setAiConfig] = useState<AiChatbotConfig | null>(null);
  const [availableModels, setAvailableModels] = useState<AiModelOption[]>([
    {
      id: 'gemini-3.8-flash',
      name: 'Gemini 3.8 Flash (Última Geração - Recomendado)',
      description: 'Mais veloz e melhor interpretação.',
      isLatest: true,
    },
    {
      id: 'gemini-3.5-flash',
      name: 'Gemini 3.5 Flash',
      description: 'Alta precisão e raciocínio refinado.',
    },
    {
      id: 'gemini-3.1-flash-lite',
      name: 'Gemini 3.1 Flash-Lite',
      description: 'Ultra-rápido com latência mínima.',
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      description: 'Versão consolidada de alta velocidade.',
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      description: 'Maior capacidade analítica.',
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      description: 'Geração 2.0 estável.',
    },
  ]);
  const [isSavingAi, setIsSavingAi] = useState(false);

  // Estados do Simulador de Teste
  const [testMessage, setTestMessage] = useState('');
  const [testReply, setTestReply] = useState('');
  const [isTestingAi, setIsTestingAi] = useState(false);

  const webhookUrl = `${API_URL}/whatsapp/webhook`;

  // Carregar configurações iniciais
  useEffect(() => {
    whatsappApi
      .getChannel()
      .then((data) => setChannel(data))
      .catch(() => toast.error('Falha ao carregar credenciais do WhatsApp.'));

    whatsappApi
      .getAiConfig()
      .then((data) => setAiConfig(data))
      .catch(() => toast.error('Falha ao carregar configurações da IA.'));

    whatsappApi
      .getAiModels()
      .then((models) => {
        if (models?.length) setAvailableModels(models);
      })
      .catch(() => null);
  }, [toast]);

  // Salvar canal do WhatsApp
  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingChannel(true);
    try {
      const payload = { ...channel, isActive: true };
      const updated = await whatsappApi.updateChannel(payload);
      setChannel(updated);
      toast.success('Credenciais da Meta salvas com sucesso!');
    } catch {
      toast.error('Erro ao salvar credenciais do WhatsApp.');
    } finally {
      setIsSavingChannel(false);
    }
  };

  // Salvar configurações de IA
  const handleSaveAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiConfig) return;
    setIsSavingAi(true);
    try {
      const updated = await whatsappApi.updateAiConfig(aiConfig);
      setAiConfig(updated);
      toast.success('Configurações da Cloe (IA) salvas com sucesso!');
    } catch {
      toast.error('Erro ao atualizar configurações da IA.');
    } finally {
      setIsSavingAi(false);
    }
  };

  // Testar resposta da IA
  const handleTestPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMessage.trim() || isTestingAi || !aiConfig) return;

    setIsTestingAi(true);
    setTestReply('');
    try {
      const res = await whatsappApi.testAiPrompt(
        testMessage.trim(),
        aiConfig.systemPrompt,
        aiConfig.geminiModel,
      );
      setTestReply(res.reply);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao simular resposta da IA.';
      toast.error(message);
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    toast.success('URL do webhook copiada!');
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <PageWrap>
      <PageHeader>
        <div>
          <h2>WhatsApp & Atendimento IA</h2>
          <p>
            Configure a integração oficial com a Meta Cloud API e personalize o comportamento da Cloe (IA).
          </p>
        </div>
      </PageHeader>

      <TabNavigation>
        <NavTabButton
          $active={activeTab === 'CONNECTION'}
          onClick={() => setActiveTab('CONNECTION')}
        >
          <Radio size={16} /> Conexão WhatsApp (Meta Cloud API)
        </NavTabButton>
        <NavTabButton
          $active={activeTab === 'AI'}
          onClick={() => setActiveTab('AI')}
        >
          <Bot size={16} /> Chatbot com IA Cloe
        </NavTabButton>
      </TabNavigation>

      {/* ── ABA 1: CONEXÃO COM A META ── */}
      {activeTab === 'CONNECTION' && (
        <ContentGrid>
          <FormCard onSubmit={handleSaveChannel}>
            <CardTitle>Credenciais da Meta for Developers</CardTitle>
            <CardDescription>
              Insira as credenciais do seu aplicativo do WhatsApp Business na plataforma da Meta.
            </CardDescription>

            <FieldGroup>
              <label>Phone Number ID</label>
              <input
                type="text"
                placeholder="Ex: 104523789012345"
                value={channel.phoneNumberId}
                onChange={(e) =>
                  setChannel({ ...channel, phoneNumberId: e.target.value })
                }
                required
              />
            </FieldGroup>

            <FieldGroup>
              <label>WhatsApp Business Account ID (WABA ID)</label>
              <input
                type="text"
                placeholder="Ex: 201293847561029"
                value={channel.wabaId}
                onChange={(e) =>
                  setChannel({ ...channel, wabaId: e.target.value })
                }
                required
              />
            </FieldGroup>

            <FieldGroup>
              <label>Número do WhatsApp (com DDI e DDD)</label>
              <input
                type="text"
                placeholder="Ex: 5511999999999"
                value={channel.phoneNumber}
                onChange={(e) =>
                  setChannel({ ...channel, phoneNumber: e.target.value })
                }
                required
              />
            </FieldGroup>

            <FieldGroup>
              <label>Token de Acesso Permanente (System User Token)</label>
              <input
                type="password"
                placeholder="EAAG..."
                value={channel.accessToken}
                onChange={(e) =>
                  setChannel({ ...channel, accessToken: e.target.value })
                }
                required
              />
            </FieldGroup>

            <FieldGroup>
              <label>Token de Verificação do Webhook</label>
              <input
                type="text"
                value={channel.verifyToken}
                onChange={(e) =>
                  setChannel({ ...channel, verifyToken: e.target.value })
                }
                required
              />
              <FieldHelp>
                Esse mesmo token deve ser informado no campo "Verify Token" no painel da Meta ao registrar o webhook.
              </FieldHelp>
            </FieldGroup>

            <SaveButton type="submit" disabled={isSavingChannel}>
              <Save size={16} /> {isSavingChannel ? 'Salvando...' : 'Salvar Conexão'}
            </SaveButton>
          </FormCard>

          <SideCard>
            <CardTitle>Configuração do Webhook na Meta</CardTitle>
            <CardDescription>
              Cole esta URL no painel do Meta Developer para receber mensagens e recibos em tempo real:
            </CardDescription>

            <CopyBox>
              <code>{webhookUrl}</code>
              <button type="button" onClick={handleCopyWebhook}>
                {copiedWebhook ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </CopyBox>

            <StepsList>
              <li>
                <strong>1.</strong> Acesse o Meta App &gt; <em>WhatsApp</em> &gt; <em>Configuration</em>.
              </li>
              <li>
                <strong>2.</strong> Clique em <em>Edit</em> em <strong>Callback URL</strong> e cole o link acima.
              </li>
              <li>
                <strong>3.</strong> Informe o Verify Token configurado ao lado e confirme.
              </li>
              <li>
                <strong>4.</strong> Na seção <em>Webhook fields</em>, marque os campos <code>messages</code>.
              </li>
            </StepsList>
          </SideCard>
        </ContentGrid>
      )}

      {/* ── ABA 2: CÉREBRO DA IA (Cloe) ── */}
      {activeTab === 'AI' && aiConfig && (
        <ContentGrid>
          <FormCard onSubmit={handleSaveAi}>
            <CardTitle>Configurações da Cloe (Assistente PicPlus)</CardTitle>
            <CardDescription>
              Personalize o nome, tom de voz, regras de atendimento e conhecimentos sobre a PicPlus.
            </CardDescription>

            <ToggleRow>
              <div>
                <strong>Ativar Atendimento por IA</strong>
                <p>Quando ativado, novos contatos são atendidos automaticamente pela IA.</p>
              </div>
              <input
                type="checkbox"
                checked={aiConfig.isActive}
                onChange={(e) =>
                  setAiConfig({ ...aiConfig, isActive: e.target.checked })
                }
              />
            </ToggleRow>

            <FieldRow>
              <FieldGroup>
                <label>Nome da Persona</label>
                <input
                  type="text"
                  value={aiConfig.personaName}
                  onChange={(e) =>
                    setAiConfig({ ...aiConfig, personaName: e.target.value })
                  }
                  required
                />
              </FieldGroup>

              <FieldGroup>
                <label>Modelo do Google Gemini</label>
                <select
                  value={aiConfig.geminiModel}
                  onChange={(e) =>
                    setAiConfig({ ...aiConfig, geminiModel: e.target.value })
                  }
                >
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </FieldGroup>
            </FieldRow>

            <FieldGroup>
              <label>Chave de API do Gemini (Opcional se configurada no .env)</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={aiConfig.geminiApiKey || ''}
                onChange={(e) =>
                  setAiConfig({ ...aiConfig, geminiApiKey: e.target.value })
                }
              />
            </FieldGroup>

            <FieldGroup>
              <label>Prompt do Sistema (Instruções da Agência e Persona)</label>
              <textarea
                rows={12}
                value={aiConfig.systemPrompt}
                onChange={(e) =>
                  setAiConfig({ ...aiConfig, systemPrompt: e.target.value })
                }
                required
              />
            </FieldGroup>

            <FieldGroup>
              <label>Palavras de Transferência Humana (Handoff)</label>
              <input
                type="text"
                placeholder="Separe por vírgulas: atendente, humano, falar com alguém"
                value={aiConfig.autoHandoffKeywords.join(', ')}
                onChange={(e) =>
                  setAiConfig({
                    ...aiConfig,
                    autoHandoffKeywords: e.target.value
                      .split(',')
                      .map((k) => k.trim())
                      .filter(Boolean),
                  })
                }
              />
              <FieldHelp>
                Se o cliente enviar qualquer uma dessas palavras, o bot transfere na hora para a equipe.
              </FieldHelp>
            </FieldGroup>

            <SaveButton type="submit" disabled={isSavingAi}>
              <Save size={16} /> {isSavingAi ? 'Salvando...' : 'Salvar Configurações da IA'}
            </SaveButton>
          </FormCard>

          {/* Simulador de Teste */}
          <SideCard>
            <CardTitle>
              <Sparkles size={18} color="#B6E829" /> Simulador de Conversa
            </CardTitle>
            <CardDescription>
              Envie uma pergunta como se fosse um cliente para testar como a Cloe responderá com o prompt atual:
            </CardDescription>

            <TestForm onSubmit={handleTestPrompt}>
              <textarea
                placeholder="Ex: 'Olá! Sou de uma marca de cosméticos e queria saber como vocês trabalham com influenciadores.'"
                rows={3}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
              />
              <TestSubmitButton
                type="submit"
                disabled={!testMessage.trim() || isTestingAi}
              >
                <Send size={15} /> {isTestingAi ? 'Consultando IA...' : 'Testar Resposta'}
              </TestSubmitButton>
            </TestForm>

            {testReply && (
              <TestReplyCard>
                <strong>Cloe (Resposta Simulada):</strong>
                <p>{testReply}</p>
              </TestReplyCard>
            )}
          </SideCard>
        </ContentGrid>
      )}
    </PageWrap>
  );
}

// ─────────────────────────────────────────────────────────────
// Styled Components (Paleta Oficial PicPlus: #0a0a0a, #171717, #B6E829)
// ─────────────────────────────────────────────────────────────

const PageWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 2rem;
`;

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text};
    margin: 0;
  }

  p {
    margin: 0.35rem 0 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.875rem;
  }
`;

const TabNavigation = styled.div`
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 0.5rem;
`;

const NavTabButton = styled.button<{ $active: boolean }>`
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primarySoft : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.textSecondary};
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primaryBorder : 'transparent'};
  padding: 0.55rem 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.875rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 1.5rem;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const FormCard = styled.form`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const SideCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: fit-content;
`;

const CardTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CardDescription = styled.p`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin: 0;
  line-height: 1.45;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text};
  }

  input,
  select,
  textarea {
    background: ${({ theme }) => theme.colors.surfaceElevated};
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.radii.md};
    padding: 0.65rem 0.85rem;
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.875rem;
    outline: none;
    font-family: inherit;

    &:focus {
      border-color: ${({ theme }) => theme.colors.primary};
    }
  }

  textarea {
    resize: vertical;
  }
`;

const FieldHelp = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem;
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};

  strong {
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.9rem;
    display: block;
  }

  p {
    margin: 2px 0 0;
    font-size: 0.78rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }

  input[type='checkbox'] {
    width: 20px;
    height: 20px;
    accent-color: ${({ theme }) => theme.colors.primary};
    cursor: pointer;
  }
`;

const SaveButton = styled.button`
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.textDark};
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 0.75rem 1.25rem;
  font-size: 0.9rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  align-self: flex-start;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CopyBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 0.6rem 0.85rem;

  code {
    font-size: 0.8rem;
    color: ${({ theme }) => theme.colors.primary};
    word-break: break-all;
  }

  button {
    background: transparent;
    border: none;
    color: ${({ theme }) => theme.colors.textSecondary};
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 0.2rem;

    &:hover {
      color: ${({ theme }) => theme.colors.text};
    }
  }
`;

const StepsList = styled.ol`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  li {
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.45;

    strong {
      color: ${({ theme }) => theme.colors.text};
    }

    code {
      background: ${({ theme }) => theme.colors.surfaceElevated};
      padding: 1px 4px;
      border-radius: 4px;
      color: ${({ theme }) => theme.colors.primary};
    }
  }
`;

const TestForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;

  textarea {
    background: ${({ theme }) => theme.colors.surfaceElevated};
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.radii.md};
    padding: 0.65rem;
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.8125rem;
    outline: none;
    resize: none;
    font-family: inherit;

    &:focus {
      border-color: ${({ theme }) => theme.colors.primary};
    }
  }
`;

const TestSubmitButton = styled.button`
  background: ${({ theme }) => theme.colors.primarySoft};
  border: 1px solid ${({ theme }) => theme.colors.primaryBorder};
  color: ${({ theme }) => theme.colors.primary};
  padding: 0.5rem 0.85rem;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;

  &:hover {
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textDark};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TestReplyCard = styled.div`
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border: 1px solid ${({ theme }) => theme.colors.primaryBorder};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 0.85rem;
  font-size: 0.8125rem;

  strong {
    color: ${({ theme }) => theme.colors.primary};
    display: block;
    margin-bottom: 0.35rem;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.text};
    line-height: 1.45;
    white-space: pre-wrap;
  }
`;
