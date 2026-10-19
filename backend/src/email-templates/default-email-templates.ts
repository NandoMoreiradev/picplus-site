import { EmailTriggerType } from '@prisma/client';
import type { EmailDesignJson } from './email-renderer.service';

export interface TriggerOption {
  value: EmailTriggerType;
  label: string;
  description: string;
  category: 'academy' | 'site';
}

export interface MergeTagDefinition {
  tag: string;
  label: string;
  example: string;
  category: 'Aluno' | 'Curso' | 'Pedido' | 'Certificado' | 'Site';
}

export const AVAILABLE_TRIGGERS: TriggerOption[] = [
  {
    value: EmailTriggerType.ACADEMY_WELCOME,
    label: 'Academy: Boas-vindas ao Aluno',
    description: 'Enviado quando um novo aluno cria conta na PicPlus Academy.',
    category: 'academy',
  },
  {
    value: EmailTriggerType.ACADEMY_PURCHASE_APPROVED,
    label: 'Academy: Compra Aprovada (Mercado Pago)',
    description:
      'Enviado quando o pagamento do curso é aprovado e o acesso é liberado.',
    category: 'academy',
  },
  {
    value: EmailTriggerType.ACADEMY_ADMIN_GRANT,
    label: 'Academy: Matrícula Cortesia / Manual',
    description:
      'Enviado quando a equipe libera manualmente um curso para o aluno.',
    category: 'academy',
  },
  {
    value: EmailTriggerType.ACADEMY_CERTIFICATE_ISSUED,
    label: 'Academy: Certificado Emitido (100%)',
    description:
      'Enviado quando o aluno conclui todas as aulas e recebe o certificado.',
    category: 'academy',
  },
  {
    value: EmailTriggerType.ACADEMY_COMMENT_REPLY,
    label: 'Academy: Resposta à Dúvida na Aula',
    description:
      'Enviado quando a equipe PicPlus responde um comentário do aluno.',
    category: 'academy',
  },
  {
    value: EmailTriggerType.ACADEMY_PASSWORD_RESET,
    label: 'Academy: Recuperação de Senha',
    description: 'Enviado quando o aluno solicita redefinição de senha.',
    category: 'academy',
  },
  {
    value: EmailTriggerType.INFLUENCER_RECEIVED,
    label: 'Site: Cadastro de Influenciador Recebido',
    description: 'Confirmação enviada ao influenciador após o cadastro.',
    category: 'site',
  },
  {
    value: EmailTriggerType.INFLUENCER_APPROVED,
    label: 'Site: Influenciador Aprovado',
    description: 'Aviso enviado quando o perfil do influenciador é aprovado.',
    category: 'site',
  },
  {
    value: EmailTriggerType.INFLUENCER_REJECTED,
    label: 'Site: Influenciador Recusado',
    description: 'Aviso enviado quando o cadastro do influenciador é recusado.',
    category: 'site',
  },
  {
    value: EmailTriggerType.CONTACT_RECEIVED,
    label: 'Site: Contato / Orçamento Recebido',
    description: 'Confirmação enviada para quem preenche o formulário do site.',
    category: 'site',
  },
];

export const AVAILABLE_MERGE_TAGS: MergeTagDefinition[] = [
  {
    tag: '{{student.name}}',
    label: 'Nome completo do aluno',
    example: 'Camila Mendes',
    category: 'Aluno',
  },
  {
    tag: '{{student.first_name}}',
    label: 'Primeiro nome do aluno',
    example: 'Camila',
    category: 'Aluno',
  },
  {
    tag: '{{student.email}}',
    label: 'E-mail do aluno',
    example: 'camila@exemplo.com',
    category: 'Aluno',
  },
  {
    tag: '{{course.title}}',
    label: 'Nome do curso',
    example: 'Posicionamento e Conteúdo para Criadores',
    category: 'Curso',
  },
  {
    tag: '{{course.instructor}}',
    label: 'Instrutor do curso',
    example: 'Equipe PicPlus',
    category: 'Curso',
  },
  {
    tag: '{{course.workload_hours}}',
    label: 'Carga horária (h)',
    example: '12',
    category: 'Curso',
  },
  {
    tag: '{{course.url}}',
    label: 'Link para acessar o curso',
    example: 'https://picplus.com.br/academy/minha-area',
    category: 'Curso',
  },
  {
    tag: '{{lesson.title}}',
    label: 'Título da aula',
    example: 'Módulo 1: Roteiro de Alta Retenção',
    category: 'Curso',
  },
  {
    tag: '{{order.amount}}',
    label: 'Valor pago formatado',
    example: 'R$ 297,00',
    category: 'Pedido',
  },
  {
    tag: '{{order.id}}',
    label: 'Código do pedido',
    example: 'ORD-98F2A',
    category: 'Pedido',
  },
  {
    tag: '{{certificate.code}}',
    label: 'Código de validação do certificado',
    example: 'PIC-2026-A8F9K2',
    category: 'Certificado',
  },
  {
    tag: '{{certificate.url}}',
    label: 'Link público do certificado',
    example: 'https://picplus.com.br/academy/certificado/PIC-2026-A8F9K2',
    category: 'Certificado',
  },
  {
    tag: '{{action_url}}',
    label: 'Link principal de ação (acesso / redefinição)',
    example: 'https://picplus.com.br/academy/minha-area',
    category: 'Site',
  },
  {
    tag: '{{reply_content}}',
    label: 'Conteúdo da resposta ou motivo',
    example: 'Excelente pergunta! Recomendamos gravar em 60fps.',
    category: 'Site',
  },
];

export interface DefaultEmailTemplateSeed {
  name: string;
  subject: string;
  trigger: EmailTriggerType;
  designJson: EmailDesignJson;
}

export const DEFAULT_EMAIL_TEMPLATES: DefaultEmailTemplateSeed[] = [
  {
    name: 'Boas-vindas à PicPlus Academy',
    subject: 'Bem-vindo(a) à PicPlus Academy, {{student.first_name}}! 🚀',
    trigger: EmailTriggerType.ACADEMY_WELCOME,
    designJson: {
      settings: {
        backgroundColor: '#0a0a0a',
        cardBackgroundColor: '#171717',
        textColor: '#d4d4d4',
        accentColor: '#B6E829',
      },
      blocks: [
        {
          id: 'w-1',
          type: 'heading',
          props: {
            level: 'h1',
            text: 'Sua jornada na PicPlus Academy começa agora!',
          },
        },
        {
          id: 'w-2',
          type: 'text',
          props: {
            text: 'Olá, {{student.name}}!\n\nSua conta de aluno na PicPlus Academy foi criada com sucesso. Aqui você encontra treinamentos práticos de influência, audiovisual e posicionamento criados por quem vive o mercado todos os dias.',
          },
        },
        {
          id: 'w-3',
          type: 'button',
          props: {
            label: 'Acessar minha área do aluno',
            href: '{{action_url}}',
          },
        },
      ],
    },
  },
  {
    name: 'Compra Aprovada — Curso Liberado',
    subject: 'Acesso liberado: {{course.title}} 🎉',
    trigger: EmailTriggerType.ACADEMY_PURCHASE_APPROVED,
    designJson: {
      settings: {
        backgroundColor: '#0a0a0a',
        cardBackgroundColor: '#171717',
        textColor: '#d4d4d4',
        accentColor: '#B6E829',
      },
      blocks: [
        {
          id: 'p-1',
          type: 'heading',
          props: {
            level: 'h1',
            text: 'Pagamento confirmado! Seu curso já está liberado 🎉',
          },
        },
        {
          id: 'p-2',
          type: 'text',
          props: {
            text: 'Olá, {{student.first_name}}!\n\nSeu pagamento para o curso "{{course.title}}" foi aprovado com sucesso.',
          },
        },
        {
          id: 'p-3',
          type: 'callout',
          props: {
            text: 'Curso: {{course.title}}\nInstrutor(a): {{course.instructor}}\nValor confirmado: {{order.amount}}',
          },
        },
        {
          id: 'p-4',
          type: 'button',
          props: {
            label: 'Começar a assistir agora',
            href: '{{course.url}}',
          },
        },
      ],
    },
  },
  {
    name: 'Matrícula Liberada pela Equipe (Cortesia)',
    subject: 'Você recebeu acesso ao curso {{course.title}}! 🎁',
    trigger: EmailTriggerType.ACADEMY_ADMIN_GRANT,
    designJson: {
      settings: {
        backgroundColor: '#0a0a0a',
        cardBackgroundColor: '#171717',
        textColor: '#d4d4d4',
        accentColor: '#B6E829',
      },
      blocks: [
        {
          id: 'g-1',
          type: 'heading',
          props: {
            level: 'h1',
            text: 'Novo curso liberado na sua conta!',
          },
        },
        {
          id: 'g-2',
          type: 'text',
          props: {
            text: 'Olá, {{student.first_name}}!\n\nA equipe da PicPlus liberou o seu acesso completo ao curso "{{course.title}}". Todas as aulas e materiais complementares já estão disponíveis na sua área do aluno.',
          },
        },
        {
          id: 'g-3',
          type: 'button',
          props: {
            label: 'Acessar o curso',
            href: '{{course.url}}',
          },
        },
      ],
    },
  },
  {
    name: 'Certificado de Conclusão Emitido',
    subject: 'Parabéns! Seu certificado de {{course.title}} está pronto 🏆',
    trigger: EmailTriggerType.ACADEMY_CERTIFICATE_ISSUED,
    designJson: {
      settings: {
        backgroundColor: '#0a0a0a',
        cardBackgroundColor: '#171717',
        textColor: '#d4d4d4',
        accentColor: '#B6E829',
      },
      blocks: [
        {
          id: 'c-1',
          type: 'heading',
          props: {
            level: 'h1',
            text: 'Parabéns pela conclusão do curso, {{student.first_name}}! 🏆',
          },
        },
        {
          id: 'c-2',
          type: 'text',
          props: {
            text: 'Você concluiu 100% das aulas de "{{course.title}}" ({{course.workload_hours}}h). Seu certificado oficial da PicPlus Academy já foi emitido.',
          },
        },
        {
          id: 'c-3',
          type: 'callout',
          props: {
            text: 'Código de autenticidade: {{certificate.code}}',
          },
        },
        {
          id: 'c-4',
          type: 'button',
          props: {
            label: 'Visualizar e baixar meu certificado',
            href: '{{certificate.url}}',
          },
        },
      ],
    },
  },
  {
    name: 'Resposta da Equipe na Aula',
    subject: 'Sua dúvida na aula "{{lesson.title}}" foi respondida 💬',
    trigger: EmailTriggerType.ACADEMY_COMMENT_REPLY,
    designJson: {
      settings: {
        backgroundColor: '#0a0a0a',
        cardBackgroundColor: '#171717',
        textColor: '#d4d4d4',
        accentColor: '#B6E829',
      },
      blocks: [
        {
          id: 'r-1',
          type: 'heading',
          props: {
            level: 'h2',
            text: 'Nova resposta na aula "{{lesson.title}}"',
          },
        },
        {
          id: 'r-2',
          type: 'text',
          props: {
            text: 'Olá, {{student.first_name}}! A equipe da PicPlus respondeu ao seu comentário no curso "{{course.title}}":',
          },
        },
        {
          id: 'r-3',
          type: 'callout',
          props: {
            text: '{{reply_content}}',
          },
        },
        {
          id: 'r-4',
          type: 'button',
          props: {
            label: 'Ver na sala de aula',
            href: '{{course.url}}',
          },
        },
      ],
    },
  },
  {
    name: 'Recuperação de Senha do Aluno',
    subject: 'Redefinição de senha — PicPlus Academy',
    trigger: EmailTriggerType.ACADEMY_PASSWORD_RESET,
    designJson: {
      settings: {
        backgroundColor: '#0a0a0a',
        cardBackgroundColor: '#171717',
        textColor: '#d4d4d4',
        accentColor: '#B6E829',
      },
      blocks: [
        {
          id: 'pw-1',
          type: 'heading',
          props: {
            level: 'h2',
            text: 'Solicitação para redefinir sua senha',
          },
        },
        {
          id: 'pw-2',
          type: 'text',
          props: {
            text: 'Olá, {{student.first_name}}!\n\nRecebemos um pedido para redefinir a senha da sua conta na PicPlus Academy. Clique no botão abaixo para criar uma nova senha (o link expira em 1 hora):',
          },
        },
        {
          id: 'pw-3',
          type: 'button',
          props: {
            label: 'Criar nova senha',
            href: '{{action_url}}',
          },
        },
      ],
    },
  },
];
