import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useStudentAuth } from '../../../context/student-auth-context';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { studentApi, type StudentEnrolledCourse } from '../../../lib/academy';
import { trackEcommerceEvent, trackEvent } from '../../../lib/analytics';

const COURSE_SLUG = 'como-planejar-o-sucesso-audiobook';
const CHECKOUT_ROUTE = `/academy/checkout/${COURSE_SLUG}`;
const CLASSROOM_ROUTE = `/academy/aula/${COURSE_SLUG}`;
const ASSET_BASE = '/courses/como-planejar-o-sucesso';
const COURSE_PRICE_BRL = 19.9;
const COURSE_PRICE_DISPLAY = '19,90';
const COURSE_OG_IMAGE =
  'https://assets.picpluscompany.com.br/uploads/80802075-ba6b-4396-a1a3-d5ebf318c6eb.png';

const PALESTRA_WHATSAPP_NUMBER = '5579988390389';
const PALESTRA_WHATSAPP_MESSAGE =
  'Olá! Vim pela página do audiobook Como Planejar o Sucesso e gostaria de saber mais sobre contratar uma palestra do Diego da Costa para o meu evento/empresa.';
const PALESTRA_WHATSAPP_URL = `https://wa.me/${PALESTRA_WHATSAPP_NUMBER}?text=${encodeURIComponent(
  PALESTRA_WHATSAPP_MESSAGE,
)}`;

const WAVEFORM_BARS = Array.from({ length: 48 }, (_, i) =>
  Math.round(25 + Math.abs(Math.sin(i * 1.7) * 55) + (i % 3) * 8),
);

const PAIN_POINTS = [
  'Você começa a semana cheio de planos e termina apagando incêndios.',
  'Trabalho, família e saúde disputam o mesmo espaço, e alguém sempre sai perdendo.',
  'Suas metas são vagas (“crescer”, “me organizar”) e nunca viram ação concreta.',
  'Já testou agendas e aplicativos, mas nenhum método parece “feito para você”.',
];

const BENEFITS = [
  {
    icon: '🧭',
    title: 'Escolher a vida que deseja',
    text: 'Clareza sobre o que você quer antes de encher a agenda: o primeiro passo de qualquer plano.',
  },
  {
    icon: '⚖️',
    title: 'As 4 áreas prioritárias',
    text: 'Saúde e energia, carreira, relacionamentos e conexão com o Criador: como dar atenção a cada uma sem abandonar as outras.',
  },
  {
    icon: '🎯',
    title: 'Metas SMART de verdade',
    text: 'Transforme objetivos vagos em metas específicas, mensuráveis, atingíveis, relevantes e com prazo.',
  },
  {
    icon: '🗓️',
    title: '5 passos para uma semana melhor',
    text: 'Ferramenta, melhor dia, lista do amanhã, compromisso na agenda e monitoramento: o passo a passo completo.',
  },
  {
    icon: '🧠',
    title: 'Arrumar a bagunça mental',
    text: 'Como cuidar da mente e do emocional para que o planejamento não vire mais uma fonte de ansiedade.',
  },
  {
    icon: '🙋',
    title: 'O seu jeito é o jeito certo',
    text: 'Autoconhecimento (corpo, alma e espírito) para montar uma rotina que funciona para você, não para os outros.',
  },
];

const TARGET_AUDIENCE = [
  'É empreendedor, gestor ou profissional e sente que a agenda manda em você.',
  'Quer crescer na carreira sem sacrificar a família, a saúde e a fé.',
  'Precisa de um método simples e aplicável já na próxima segunda-feira.',
  'Prefere aprender ouvindo, no trânsito, no treino ou em casa.',
  'Quer transformar objetivos soltos em metas com prazo e acompanhamento.',
];

const TRACK_SECTIONS = [
  {
    part: 'Abertura',
    tracks: [
      { num: '01', title: 'Agradecimento', duration: '4:07' },
      { num: '02', title: 'Apresentação', duration: '3:30' },
      { num: '03', title: 'Prefácio', duration: '4:53' },
      { num: '04', title: 'Introdução', duration: '3:39' },
    ],
  },
  {
    part: 'Parte 1 · Um download da administração no tempo',
    tracks: [
      { num: '05', title: 'Abertura da Parte 1', duration: '2:00' },
      { num: '06', title: 'Escolha a vida que deseja', duration: '1:59' },
      { num: '07', title: 'Técnicas para administrar o tempo', duration: '2:17' },
      { num: '08', title: 'Quatro áreas prioritárias da vida', duration: '12:28' },
      { num: '09', title: 'Como administrar o tempo?', duration: '5:14' },
    ],
  },
  {
    part: 'Parte 2 · O melhor método de administração no tempo',
    tracks: [
      { num: '10', title: 'Abertura da Parte 2', duration: '2:42' },
      { num: '11', title: 'O seu jeito é o jeito certo', duration: '2:21' },
      { num: '12', title: 'Quem é você?', duration: '2:22' },
      { num: '13', title: 'Meta SMART', duration: '2:31' },
      { num: '14', title: 'Planejar é o melhor começo', duration: '2:12' },
      { num: '15', title: 'Arrumar a bagunça mental', duration: '2:15' },
      { num: '16', title: 'Cinco passos para uma semana melhor', duration: '12:26' },
    ],
  },
  {
    part: 'Fechamento',
    tracks: [
      {
        num: '17',
        title: 'Conclusão: realização, propósito, equilíbrio e resultado',
        duration: '2:16',
      },
    ],
  },
];

const AUTHOR_TAGS = [
  'MBA em Gestão',
  'Administrador',
  'Radialista',
  'Escritor',
  'Negócios & Estratégia',
];

const RECOMMENDATIONS = [
  {
    quote:
      'No livro, o autor mostra caminhos práticos para você planejar a sua vida pessoal e profissional. Diego mostra passo a passo o caminho, o processo, para você administrar melhor a sua agenda.',
    author: 'Aroldo Franca',
    role: 'Engenheiro e CEO da Valor Negócios Imobiliários · trecho da Apresentação',
  },
  {
    quote:
      'Um verdadeiro manual de instruções de como mudar suas vidas e sua eficácia profissional utilizando essa técnica de administração e qualidade de vida: a gestão do tempo.',
    author: 'Juliano Cesar Faria Souto',
    role: 'Sócio administrador da Fasouto e vice-presidente da ABAD · trecho do Prefácio',
  },
];

const OFFER_ITEMS = [
  '17 faixas em áudio, aprox. 71 minutos',
  'Narrado pelo próprio autor, Diego da Costa',
  'Método dos 5 passos para uma semana melhor',
  'Metas SMART e as 4 áreas prioritárias da vida',
  'Acesso imediato e vitalício na área do aluno, ouça quantas vezes quiser',
];

const LECTURE_TOPICS = [
  '🎤 Como Planejar o Sucesso: gestão no tempo na prática',
  '🎯 Metas SMART para equipes de alta performance',
  '⚖️ Equilíbrio entre carreira, família, saúde e propósito',
];

const FAQ_ITEMS = [
  {
    q: 'Como recebo o audiobook?',
    a: 'Logo após a confirmação do pagamento, o acesso é liberado automaticamente na sua área do aluno aqui na PicPlus Academy (no Pix e no cartão a liberação é imediata) e você também recebe os dados de acesso por e-mail.',
  },
  {
    q: 'Quem narra o audiobook?',
    a: 'O próprio autor, Diego da Costa.',
  },
  {
    q: 'Posso ouvir no celular?',
    a: 'Sim. Você pode ouvir direto pelo celular, computador ou tablet quantas vezes quiser.',
  },
  {
    q: 'Quais as formas de pagamento?',
    a: 'Pix e cartão de crédito, com processamento seguro via Mercado Pago.',
  },
  {
    q: 'E se eu não gostar?',
    a: 'Você tem 7 dias de garantia. Se não ficar satisfeito, devolvemos 100% do valor.',
  },
  {
    q: 'Preciso ter lido o livro?',
    a: 'Não. O audiobook traz o conteúdo completo do livro, do agradecimento à conclusão.',
  },
  {
    q: 'Como contrato uma palestra do Diego?',
    a: 'Clique em “Contratar palestra” e fale com a equipe pelo WhatsApp. Informe a data, a cidade e o público do evento.',
  },
];

const LpRoot = styled.div`
  --fundo: #030a24;
  --fundo-2: #061440;
  --azul: #1f5bff;
  --azul-claro: #4f9bff;
  --ciano: #38e1ff;
  --branco: #ffffff;
  --texto: #e6ecff;
  --texto-suave: #9fb0e0;
  --borda: rgba(120, 160, 255, 0.18);
  --vidro: rgba(255, 255, 255, 0.04);
  --whats: #25d366;
  --raio: 20px;
  --fonte-titulo: 'Montserrat', system-ui, sans-serif;
  --fonte-texto: 'Inter', system-ui, sans-serif;

  font-family: var(--fonte-texto);
  color: var(--texto);
  background: var(--fundo);
  line-height: 1.6;
  font-size: 17px;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
  position: relative;

  img {
    max-width: 100%;
    height: auto;
    display: block;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  .wrap {
    max-width: 1160px;
    margin: 0 auto;
    padding: 0 20px;
    position: relative;
    z-index: 2;
  }

  .narrow {
    max-width: 780px;
  }

  section {
    padding: 96px 0;
    position: relative;
    overflow: hidden;
  }

  h1,
  h2,
  h3 {
    font-family: var(--fonte-titulo);
    line-height: 1.08;
    color: var(--branco);
  }

  h2 {
    font-size: clamp(30px, 4.4vw, 46px);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: -0.01em;
    margin-bottom: 18px;
  }

  h2 .grad,
  h1 .grad {
    background: linear-gradient(90deg, var(--ciano), var(--azul-claro));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  h3 {
    font-size: 20px;
    font-weight: 800;
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--fonte-titulo);
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ciano);
    margin-bottom: 14px;
  }

  .eyebrow::before {
    content: '';
    width: 22px;
    height: 2px;
    background: var(--ciano);
    box-shadow: 0 0 10px var(--ciano);
  }

  .center {
    text-align: center;
  }

  .center .eyebrow {
    justify-content: center;
  }

  .lead {
    font-size: 19px;
    color: var(--texto-suave);
  }

  .alt {
    background: var(--fundo-2);
  }

  .glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(70px);
    pointer-events: none;
    z-index: 0;
  }

  .g-azul {
    background: rgba(31, 91, 255, 0.45);
  }

  .g-ciano {
    background: rgba(56, 225, 255, 0.22);
  }

  .grid-bg {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(79, 155, 255, 0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(79, 155, 255, 0.06) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(ellipse at center, #000 30%, transparent 75%);
    -webkit-mask-image: radial-gradient(ellipse at center, #000 30%, transparent 75%);
    z-index: 0;
    pointer-events: none;
  }

  .btn {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: var(--fonte-titulo);
    font-weight: 800;
    font-size: 17px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    text-decoration: none;
    border-radius: 999px;
    padding: 18px 36px;
    transition: transform 0.15s, box-shadow 0.15s, filter 0.15s;
    cursor: pointer;
    border: 0;
    text-align: center;
    line-height: 1.2;
  }

  .btn:hover {
    transform: translateY(-2px);
    filter: brightness(1.08);
  }

  .btn-compra {
    background: linear-gradient(90deg, var(--azul), var(--ciano));
    color: #fff;
    box-shadow:
      0 0 0 1px rgba(56, 225, 255, 0.5),
      0 12px 40px rgba(31, 91, 255, 0.55),
      0 0 30px rgba(56, 225, 255, 0.35);
  }

  .btn-whats {
    background: var(--whats);
    color: #04230d;
    box-shadow: 0 12px 36px rgba(37, 211, 102, 0.35);
    flex-direction: row;
    gap: 10px;
  }

  .btn-ghost {
    background: var(--vidro);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(8px);
  }

  .btn small {
    display: block;
    font-family: var(--fonte-texto);
    font-weight: 500;
    font-size: 12px;
    letter-spacing: 0;
    text-transform: none;
    opacity: 0.9;
    margin-top: 3px;
  }

  .btn svg {
    width: 22px;
    height: 22px;
    flex: none;
  }

  .micro {
    font-size: 14px;
    color: var(--texto-suave);
    margin-top: 14px;
  }

  .micro a {
    text-decoration: underline;
    color: var(--ciano);
  }

  .topbar {
    background: linear-gradient(90deg, var(--azul), #0b2fb0, var(--azul));
    color: #fff;
    text-align: center;
    font-size: 14px;
    font-weight: 600;
    padding: 9px 16px;
    position: relative;
    z-index: 3;
  }

  /* ===== HERO ===== */
  .hero {
    overflow: hidden;
    padding: 40px 0 0;
    background:
      radial-gradient(900px 600px at 72% 40%, rgba(31, 91, 255, 0.55), transparent 65%),
      radial-gradient(600px 400px at 10% 10%, rgba(56, 225, 255, 0.12), transparent 70%),
      var(--fundo);
    position: relative;
  }

  .hero-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    align-items: end;
  }

  .hero-texto {
    padding-bottom: 90px;
  }

  .hero-grid > * {
    min-width: 0;
  }

  .logo-livro {
    font-family: var(--fonte-titulo);
    font-weight: 900;
    font-size: 15px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #fff;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 26px;
    opacity: 0.95;
  }

  .logo-livro svg {
    width: 30px;
    height: 18px;
    stroke: var(--ciano);
  }

  .hero h1 {
    font-size: clamp(34px, 4.8vw, 58px);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: -0.015em;
    margin-bottom: 20px;
  }

  .hero .lead {
    margin-bottom: 26px;
    max-width: 540px;
  }

  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 32px;
  }

  .badge {
    background: var(--vidro);
    border: 1px solid var(--borda);
    border-radius: 999px;
    padding: 8px 15px;
    font-size: 14px;
    font-weight: 600;
    color: #dfe6ff;
    backdrop-filter: blur(6px);
  }

  .hero-cta {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    align-items: center;
  }

  .hero-foto {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    min-height: 760px;
    align-self: stretch;
  }

  .anel {
    position: absolute;
    left: 50%;
    top: 48%;
    width: min(660px, 118%);
    aspect-ratio: 1;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border: 3px solid rgba(120, 220, 255, 0.95);
    box-shadow:
      0 0 18px 3px rgba(56, 225, 255, 0.9),
      0 0 60px 12px rgba(31, 91, 255, 0.75),
      inset 0 0 40px 8px rgba(56, 225, 255, 0.45);
    z-index: 0;
  }

  .anel::after {
    content: '';
    position: absolute;
    inset: -26px;
    border-radius: 50%;
    border: 1px solid rgba(120, 200, 255, 0.25);
  }

  .hero-foto picture {
    position: relative;
    z-index: 1;
    width: min(860px, 150%);
    max-width: none;
    margin-right: -120px;
  }

  .hero-foto img {
    width: 100%;
    filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.5));
  }

  .flutua {
    position: absolute;
    z-index: 2;
    background: rgba(6, 20, 64, 0.75);
    border: 1px solid var(--borda);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    padding: 12px 16px;
    font-size: 13px;
    color: #dfe6ff;
    line-height: 1.3;
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.4);
  }

  .flutua b {
    display: block;
    font-family: var(--fonte-titulo);
    font-size: 20px;
    color: #fff;
  }

  .f1 {
    left: -30px;
    top: 34%;
    animation: lpBoia 6s ease-in-out infinite;
  }

  .f2 {
    left: -30px;
    top: 64%;
    animation: lpBoia 7s ease-in-out infinite reverse;
  }

  @keyframes lpBoia {
    50% {
      transform: translateY(-12px);
    }
  }

  /* Faixa de autoridade logo abaixo do hero */
  .faixa-info {
    position: relative;
    z-index: 3;
    margin-top: -40px;
  }

  .faixa-info .box {
    background: rgba(6, 20, 64, 0.8);
    border: 1px solid var(--borda);
    backdrop-filter: blur(12px);
    border-radius: var(--raio);
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
  }

  .faixa-info .it {
    padding: 22px;
    text-align: center;
    border-right: 1px solid var(--borda);
  }

  .faixa-info .it:last-child {
    border-right: 0;
  }

  .faixa-info b {
    display: block;
    font-family: var(--fonte-titulo);
    font-weight: 900;
    font-size: 26px;
    color: #fff;
  }

  .faixa-info span {
    font-size: 14px;
    color: var(--texto-suave);
  }

  /* Player */
  .player {
    background: linear-gradient(135deg, rgba(31, 91, 255, 0.25), rgba(56, 225, 255, 0.08));
    border: 1px solid var(--borda);
    border-radius: var(--raio);
    padding: 28px;
    display: flex;
    gap: 22px;
    align-items: center;
    max-width: 760px;
    margin: 30px auto 0;
    backdrop-filter: blur(8px);
  }

  .player-btn {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--azul), var(--ciano));
    border: 0;
    display: grid;
    place-items: center;
    cursor: pointer;
    flex: none;
    box-shadow: 0 0 30px rgba(56, 225, 255, 0.6);
  }

  .player-btn svg {
    width: 28px;
    height: 28px;
    fill: #fff;
  }

  .player-info {
    flex: 1;
    min-width: 0;
    text-align: left;
  }

  .player-info b {
    font-family: var(--fonte-titulo);
    font-size: 17px;
    display: block;
    color: #fff;
  }

  .player-info span {
    font-size: 14px;
    color: var(--texto-suave);
  }

  .ondas {
    display: flex;
    gap: 3px;
    align-items: center;
    height: 34px;
    margin-top: 10px;
    cursor: pointer;
  }

  .ondas i {
    flex: 1;
    background: rgba(159, 176, 224, 0.3);
    border-radius: 2px;
    transition: background 0.15s;
  }

  .ondas i.on {
    background: var(--ciano);
    box-shadow: 0 0 6px var(--ciano);
  }

  /* Cards de vidro */
  .card {
    background: var(--vidro);
    border: 1px solid var(--borda);
    border-radius: var(--raio);
    padding: 26px;
    backdrop-filter: blur(8px);
  }

  .dores {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin-top: 36px;
  }

  .dor {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }

  .dor .x {
    flex: none;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: rgba(255, 80, 110, 0.15);
    border: 1px solid rgba(255, 80, 110, 0.5);
    color: #ff6b86;
    display: grid;
    place-items: center;
    font-weight: 800;
    font-size: 14px;
  }

  /* Virada */
  .virada {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 20px;
    align-items: center;
    margin-top: 40px;
  }

  .card-v {
    border-radius: var(--raio);
    padding: 30px;
    text-align: center;
  }

  .card-v .big {
    font-family: var(--fonte-titulo);
    font-weight: 900;
    font-size: 34px;
    display: block;
    margin-bottom: 6px;
    color: #fff;
  }

  .card-v.antes {
    background: var(--vidro);
    border: 1px dashed rgba(255, 255, 255, 0.25);
    color: var(--texto-suave);
  }

  .card-v.antes .big {
    text-decoration: line-through;
    opacity: 0.5;
  }

  .card-v.depois {
    background: linear-gradient(135deg, var(--azul), #0d3bd6);
    box-shadow: 0 0 40px rgba(31, 91, 255, 0.6);
    color: #e6f3ff;
  }

  .seta {
    font-size: 34px;
    color: var(--ciano);
    text-shadow: 0 0 14px var(--ciano);
  }

  /* Benefícios */
  .grid-3 {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-top: 44px;
  }

  .benef .ico {
    width: 54px;
    height: 54px;
    border-radius: 16px;
    background: linear-gradient(135deg, var(--azul), var(--ciano));
    display: grid;
    place-items: center;
    font-size: 24px;
    margin-bottom: 16px;
    box-shadow: 0 10px 30px rgba(31, 91, 255, 0.5);
  }

  .benef p {
    color: var(--texto-suave);
    font-size: 16px;
    margin-top: 8px;
  }

  /* Faixa branca inclinada */
  .banda {
    background: #fff;
    color: #0a1640;
    transform: skewY(-3deg);
    margin: 40px 0;
    padding: 0;
  }

  .banda > .in {
    transform: skewY(3deg);
    padding: 90px 0;
  }

  .banda h2 {
    color: #061440;
  }

  .banda .eyebrow {
    color: var(--azul);
  }

  .banda .eyebrow::before {
    background: var(--azul);
    box-shadow: none;
  }

  .checks {
    list-style: none;
    display: grid;
    gap: 14px;
    margin-top: 28px;
  }

  .checks li {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    font-size: 18px;
    color: #1c2a5c;
  }

  .checks li::before {
    content: '✓';
    flex: none;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--azul), var(--ciano));
    color: #fff;
    display: grid;
    place-items: center;
    font-weight: 800;
    font-size: 14px;
  }

  /* Sumário */
  .sumario {
    margin-top: 36px;
    border: 1px solid var(--borda);
    border-radius: var(--raio);
    overflow: hidden;
    background: var(--vidro);
  }

  .parte {
    background: linear-gradient(90deg, rgba(31, 91, 255, 0.35), transparent);
    color: var(--ciano);
    font-family: var(--fonte-titulo);
    font-weight: 800;
    font-size: 13px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 13px 22px;
  }

  .faixa {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 22px;
    border-top: 1px solid var(--borda);
    font-size: 16px;
    color: #dfe6ff;
  }

  .faixa span:first-child b {
    color: var(--azul-claro);
    font-family: var(--fonte-titulo);
    margin-right: 12px;
  }

  .faixa span:last-child {
    color: var(--texto-suave);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .sumario-total {
    padding: 14px 22px;
    font-weight: 700;
    text-align: right;
    border-top: 1px solid var(--borda);
    color: #fff;
  }

  /* Autor */
  .autor-grid {
    display: grid;
    grid-template-columns: 0.95fr 1.05fr;
    gap: 56px;
    align-items: center;
  }

  .autor-foto {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    min-height: 460px;
  }

  .autor-foto .anel {
    width: min(400px, 85%);
    top: 45%;
  }

  .autor-foto picture {
    position: relative;
    z-index: 1;
    width: min(500px, 100%);
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 18px 0;
  }

  .tag {
    background: rgba(31, 91, 255, 0.18);
    border: 1px solid var(--borda);
    color: #cfe0ff;
    font-weight: 600;
    font-size: 14px;
    border-radius: 10px;
    padding: 6px 12px;
  }

  /* Depoimentos */
  .quotes {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
    margin-top: 44px;
  }

  .quote p {
    font-size: 18px;
    color: #e3e8ff;
  }

  .quote p::before {
    content: '“';
    font-family: Georgia, serif;
    font-size: 64px;
    line-height: 0;
    vertical-align: -26px;
    color: var(--ciano);
    margin-right: 6px;
    text-shadow: 0 0 14px var(--ciano);
  }

  .quote footer {
    margin-top: 18px;
    font-size: 14px;
    color: var(--texto-suave);
  }

  .quote footer b {
    display: block;
    color: #fff;
    font-family: var(--fonte-titulo);
    font-size: 16px;
  }

  /* Oferta */
  .oferta-grid {
    display: grid;
    grid-template-columns: 0.8fr 1.2fr;
    gap: 40px;
    align-items: center;
    max-width: 980px;
    margin: 44px auto 0;
  }

  .capa {
    position: relative;
    justify-self: center;
    width: 260px;
    aspect-ratio: 2 / 3;
    background: #fff;
    border-radius: 6px 14px 14px 6px;
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.2),
      0 30px 60px rgba(0, 0, 0, 0.5),
      0 0 70px rgba(31, 91, 255, 0.6);
    padding: 28px 22px;
    color: #1a1f4a;
    transform: perspective(900px) rotateY(-14deg);
    overflow: hidden;
    text-align: left;
  }

  .capa::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 10px;
    background: linear-gradient(90deg, rgba(0, 0, 0, 0.18), transparent);
  }

  .capa .autor {
    display: inline-block;
    background: #5b4fd1;
    color: #fff;
    font-family: var(--fonte-titulo);
    font-weight: 700;
    font-size: 14px;
    padding: 6px 14px;
    margin: 0 0 26px -22px;
  }

  .capa .tit {
    font-family: var(--fonte-titulo);
    font-weight: 800;
    font-size: 25px;
    line-height: 1.05;
    text-transform: uppercase;
  }

  .capa .sub {
    font-size: 12px;
    margin-top: 10px;
    color: #3c4270;
  }

  .capa .fone {
    position: absolute;
    right: 16px;
    bottom: 16px;
    background: linear-gradient(135deg, var(--azul), var(--ciano));
    color: #fff;
    border-radius: 999px;
    padding: 8px 12px;
    font-family: var(--fonte-titulo);
    font-weight: 800;
    font-size: 11px;
    letter-spacing: 0.06em;
  }

  .capa .ondas-capa {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 45%;
    background:
      radial-gradient(ellipse at 80% 100%, rgba(79, 155, 255, 0.45), transparent 60%),
      linear-gradient(160deg, transparent 40%, rgba(31, 91, 255, 0.18));
  }

  .oferta {
    background: linear-gradient(160deg, rgba(31, 91, 255, 0.22), rgba(6, 20, 64, 0.7));
    border: 1px solid rgba(56, 225, 255, 0.35);
    border-radius: 28px;
    padding: 40px 36px;
    box-shadow: 0 0 60px rgba(31, 91, 255, 0.35);
    text-align: center;
    backdrop-filter: blur(10px);
  }

  .oferta ul {
    list-style: none;
    text-align: left;
    margin: 20px 0 24px;
    display: grid;
    gap: 10px;
  }

  .oferta li {
    display: flex;
    gap: 10px;
    color: #dfe6ff;
  }

  .oferta li::before {
    content: '✓';
    color: var(--ciano);
    font-weight: 800;
  }

  .preco {
    font-family: var(--fonte-titulo);
    font-weight: 900;
    font-size: 68px;
    color: #fff;
    line-height: 1;
    text-shadow: 0 0 30px rgba(56, 225, 255, 0.5);
  }

  .preco small {
    font-size: 24px;
    vertical-align: top;
    margin-right: 6px;
    color: var(--ciano);
  }

  .oferta .btn {
    width: 100%;
    margin-top: 22px;
  }

  .pagamentos {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 14px;
    margin-top: 16px;
    font-size: 13px;
    color: var(--texto-suave);
  }

  .garantia {
    display: flex;
    gap: 18px;
    align-items: center;
    text-align: left;
    margin-top: 26px;
    padding-top: 24px;
    border-top: 1px solid var(--borda);
  }

  .garantia .selo {
    flex: none;
    width: 78px;
    height: 78px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--azul), var(--ciano));
    color: #fff;
    display: grid;
    place-items: center;
    font-family: var(--fonte-titulo);
    font-weight: 900;
    font-size: 11px;
    text-align: center;
    line-height: 1.15;
    padding: 8px;
    box-shadow: 0 0 24px rgba(56, 225, 255, 0.5);
  }

  .garantia p {
    font-size: 15px;
    color: var(--texto-suave);
  }

  /* Palestra */
  .palestra {
    background:
      radial-gradient(800px 500px at 80% 50%, rgba(31, 91, 255, 0.5), transparent 70%),
      var(--fundo-2);
  }

  .palestra-grid {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 40px;
    align-items: end;
  }

  .palestra-grid > div:first-child {
    padding-bottom: 40px;
  }

  .temas {
    list-style: none;
    display: grid;
    gap: 10px;
    margin: 24px 0 30px;
  }

  .temas li {
    background: var(--vidro);
    border: 1px solid var(--borda);
    border-left: 3px solid var(--ciano);
    border-radius: 12px;
    padding: 13px 16px;
    font-weight: 600;
    color: #e6ecff;
  }

  .palestra .autor-foto {
    min-height: 480px;
    margin-bottom: -96px;
  }

  /* FAQ */
  .faq {
    margin-top: 34px;
    display: grid;
    gap: 12px;
  }

  .faq details {
    border: 1px solid var(--borda);
    border-radius: 14px;
    background: var(--vidro);
    padding: 18px 22px;
  }

  .faq summary {
    cursor: pointer;
    font-weight: 700;
    font-family: var(--fonte-titulo);
    font-size: 17px;
    list-style: none;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    color: #fff;
  }

  .faq summary::-webkit-details-marker {
    display: none;
  }

  .faq summary::after {
    content: '+';
    font-size: 24px;
    line-height: 1;
    color: var(--ciano);
  }

  .faq details[open] summary::after {
    content: '–';
  }

  .faq details p {
    margin-top: 12px;
    color: var(--texto-suave);
  }

  /* CTA final */
  .final {
    background:
      radial-gradient(700px 400px at 50% 100%, rgba(31, 91, 255, 0.55), transparent 70%),
      var(--fundo);
  }

  .final-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    justify-content: center;
    margin-top: 32px;
  }

  /* CTA fixo no celular */
  .sticky {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(3, 10, 36, 0.96);
    border-top: 1px solid var(--borda);
    backdrop-filter: blur(10px);
    padding: 12px 84px calc(12px + env(safe-area-inset-bottom, 0px)) 16px;
    display: none;
    gap: 12px;
    align-items: center;
    z-index: 50;
    transform: translateY(110%);
    transition: transform 0.25s;
  }

  .sticky.on {
    transform: none;
  }

  .sticky .btn {
    flex: 1;
    padding: 14px 16px;
    font-size: 14px;
  }

  .sticky .p {
    color: #fff;
    font-family: var(--fonte-titulo);
    font-weight: 900;
    font-size: 19px;
    white-space: nowrap;
  }

  /* Responsivo */
  @media (max-width: 960px) {
    section {
      padding: 72px 0;
    }
    .hero-grid,
    .autor-grid,
    .palestra-grid,
    .oferta-grid {
      grid-template-columns: 1fr;
    }
    .hero {
      padding-top: 24px;
    }
    .hero-foto {
      order: -1;
      min-height: 0;
      height: 520px;
      max-width: 560px;
      margin: 0 auto;
      width: 100%;
      overflow: visible;
    }
    .hero-foto picture {
      width: 480px;
      max-width: 115%;
      margin-right: 0;
    }
    .anel {
      width: 380px;
      top: 50%;
    }
    .hero-texto {
      padding-bottom: 70px;
      text-align: center;
    }
    .hero .lead {
      margin-left: auto;
      margin-right: auto;
    }
    .badges,
    .hero-cta {
      justify-content: center;
    }
    .logo-livro {
      display: none;
    }
    .faixa-info .box {
      grid-template-columns: 1fr 1fr;
    }
    .faixa-info .it:nth-child(2) {
      border-right: 0;
    }
    .faixa-info .it:nth-child(-n + 2) {
      border-bottom: 1px solid var(--borda);
    }
    .grid-3 {
      grid-template-columns: 1fr 1fr;
    }
    .quotes {
      grid-template-columns: 1fr;
    }
    .autor-foto {
      min-height: 380px;
      max-width: 420px;
      margin: 0 auto;
      width: 100%;
    }
    .palestra .autor-foto {
      margin-bottom: -72px;
    }
    .palestra-grid > div:first-child {
      padding-bottom: 0;
    }
    .f1 {
      left: 4px;
      top: 16%;
    }
    .f2 {
      left: auto;
      right: 4px;
      top: 60%;
    }
  }

  @media (max-width: 640px) {
    font-size: 16px;
    .wrap {
      padding: 0 16px;
    }
    .grid-3,
    .dores {
      grid-template-columns: 1fr;
    }
    .virada {
      grid-template-columns: 1fr;
    }
    .seta {
      transform: rotate(90deg);
      text-align: center;
    }
    .hero-foto {
      height: 440px;
    }
    .hero-foto picture {
      width: 400px;
      max-width: 112%;
    }
    .anel {
      width: 310px;
    }
    .flutua {
      display: none;
    }
    .hero-cta .btn,
    .palestra .btn,
    .final .btn {
      width: 100%;
    }
    .player {
      flex-direction: column;
      text-align: center;
      padding: 24px;
    }
    .player-info {
      text-align: center;
      width: 100%;
    }
    .oferta {
      padding: 32px 20px;
    }
    .preco {
      font-size: 56px;
    }
    .capa {
      width: 200px;
      padding: 22px 18px;
    }
    .capa .tit {
      font-size: 20px;
    }
    .capa .autor {
      margin-left: -18px;
    }
    .sticky {
      display: flex;
    }
    .faixa {
      font-size: 15px;
      padding: 13px 16px;
    }
    .banda > .in {
      padding: 70px 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .f1,
    .f2 {
      animation: none;
    }
  }

  /* ===== Efeito 3D ao passar o mouse ===== */
  [data-tilt] {
    transform-style: preserve-3d;
    transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
    will-change: transform;
  }

  [data-tilt].movendo {
    transition: transform 0.08s linear;
  }

  .hero-foto picture[data-tilt] {
    transform: perspective(1100px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))
      translate3d(var(--tx, 0px), var(--ty, 0px), 0) scale(var(--s, 1));
  }

  .hero-foto .anel {
    transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
    transform: translate(-50%, -50%) translate3d(var(--ax, 0px), var(--ay, 0px), 0);
  }

  .capa[data-tilt] {
    transform: perspective(900px) rotateX(var(--rx, 0deg))
      rotateY(calc(-14deg + var(--ry, 0deg))) scale(var(--s, 1));
  }

  .capa .brilho {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(
      circle at var(--gx, 50%) var(--gy, 30%),
      rgba(255, 255, 255, 0.55),
      transparent 55%
    );
    opacity: var(--go, 0);
    transition: opacity 0.3s;
    mix-blend-mode: soft-light;
    z-index: 3;
  }

  @media (hover: none) {
    .capa[data-tilt] {
      animation: lpGira 6s ease-in-out infinite;
    }
  }

  @keyframes lpGira {
    0%,
    100% {
      transform: perspective(900px) rotateY(-14deg);
    }
    50% {
      transform: perspective(900px) rotateY(8deg) rotateX(3deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    [data-tilt] {
      transition: none;
    }
    .capa[data-tilt] {
      animation: none;
    }
  }
`;

function formatTime(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function ComoPlanejarSucessoSalesPage() {
  const { student } = useStudentAuth();
  const [enrolled, setEnrolled] = useState(false);
  const isEnrolled = Boolean(student) && enrolled;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(75);
  const [showSticky, setShowSticky] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playedSampleRef = useRef(false);

  usePageMeta(
    'Como Planejar o Sucesso | Audiobook narrado por Diego da Costa — PicPlus Academy',
    'Audiobook narrado pelo próprio autor, Diego da Costa: 71 minutos de estratégias práticas para organizar sua agenda, definir metas SMART e fazer o tempo trabalhar a seu favor.',
    {
      image: COURSE_OG_IMAGE,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Audiobook',
        name: 'Como Planejar o Sucesso: Estratégias poderosas para fazer o tempo trabalhar a seu favor',
        author: { '@type': 'Person', name: 'Diego da Costa' },
        readBy: { '@type': 'Person', name: 'Diego da Costa' },
        inLanguage: 'pt-BR',
        duration: 'PT71M',
        image: COURSE_OG_IMAGE,
        publisher: { '@type': 'Organization', name: 'PicPlus Academy' },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'BRL',
          price: '19.90',
          availability: 'https://schema.org/InStock',
          url: `https://picpluscompany.com.br/academy/curso/${COURSE_SLUG}`,
        },
      },
    },
  );

  useEffect(() => {
    trackEcommerceEvent('view_item', {
      value: COURSE_PRICE_BRL,
      items: [
        {
          item_id: COURSE_SLUG,
          item_name: 'Como planejar o Sucesso (Audiobook)',
          item_category: 'Gestão e Produtividade',
          item_variant: COURSE_SLUG,
          price: COURSE_PRICE_BRL,
          quantity: 1,
        },
      ],
    });
  }, []);

  useEffect(() => {
    if (!student) return;
    let active = true;
    studentApi
      .get<StudentEnrolledCourse[]>('/academy/my-courses')
      .then((list) => {
        if (active) {
          setEnrolled(list.some((item) => item.course.slug === COURSE_SLUG));
        }
      })
      .catch(() => {
        if (active) setEnrolled(false);
      });
    return () => {
      active = false;
    };
  }, [student]);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (
      !window.matchMedia('(hover: hover)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const cleanups: Array<() => void> = [];
    root.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
      const max = Number(el.dataset.tiltMax) || 12;
      const area = el.closest<HTMLElement>('.hero-foto') || el;
      const anel = area.querySelector<HTMLElement>('.anel');

      const onMove = (e: MouseEvent) => {
        const r = area.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.classList.add('movendo');
        el.style.setProperty('--ry', `${x * max * 2}deg`);
        el.style.setProperty('--rx', `${-y * max * 2}deg`);
        el.style.setProperty('--tx', `${x * 18}px`);
        el.style.setProperty('--ty', `${y * 12}px`);
        el.style.setProperty('--s', '1.03');
        el.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
        el.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
        el.style.setProperty('--go', '1');
        if (anel) {
          anel.style.setProperty('--ax', `${-x * 30}px`);
          anel.style.setProperty('--ay', `${-y * 30}px`);
        }
      };

      const onLeave = () => {
        el.classList.remove('movendo');
        ['--ry', '--rx', '--tx', '--ty', '--s', '--go'].forEach((prop) =>
          el.style.removeProperty(prop),
        );
        if (anel) {
          anel.style.removeProperty('--ax');
          anel.style.removeProperty('--ay');
        }
      };

      area.addEventListener('mousemove', onMove);
      area.addEventListener('mouseleave', onLeave);
      cleanups.push(() => {
        area.removeEventListener('mousemove', onMove);
        area.removeEventListener('mouseleave', onLeave);
      });
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, []);

  const primaryRoute = isEnrolled ? CLASSROOM_ROUTE : CHECKOUT_ROUTE;

  const trackBuyCta = (ctaLocation: string) => {
    trackEvent('cta_click', {
      cta_name: isEnrolled ? 'Acessar audiobook' : 'Comprar audiobook Como Planejar o Sucesso',
      cta_location: ctaLocation,
      destination: primaryRoute,
      course_slug: COURSE_SLUG,
    });
  };

  const trackPalestraCta = (ctaLocation: string) => {
    trackEvent('whatsapp_click', {
      link_url: PALESTRA_WHATSAPP_URL,
      cta_name: 'Contratar palestra Diego da Costa',
      cta_location: ctaLocation,
      course_slug: COURSE_SLUG,
    });
  };

  const handleTogglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      const p = audio.play();
      if (p && p.catch) p.catch(() => {});
      if (!playedSampleRef.current) {
        playedSampleRef.current = true;
        trackEvent('play_amostra', {
          course_slug: COURSE_SLUG,
          content_name: 'Audiobook Como Planejar o Sucesso',
        });
      }
    } else {
      audio.pause();
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
  };

  const activeBars = Math.round((currentTime / (duration || 75)) * WAVEFORM_BARS.length);

  return (
    <LpRoot ref={rootRef}>
      <div className="topbar">
        🎧 Lançamento: “Como Planejar o Sucesso” agora em audiobook, narrado pelo próprio autor
      </div>

      {/* 1. HERO */}
      <header className="hero" ref={heroRef}>
        <div className="grid-bg" />
        <div className="wrap hero-grid">
          <div className="hero-texto">
            <div className="logo-livro">
              <svg viewBox="0 0 30 18" fill="none" strokeWidth="2.4">
                <path d="M1 15l8-8 6 5 13-11" />
              </svg>
              Como Planejar o Sucesso
            </div>
            <span className="eyebrow">Audiobook · Diego da Costa</span>
            <h1>
              Pare de correr atrás do tempo.{' '}
              <span className="grad">Faça o tempo trabalhar a seu favor.</span>
            </h1>
            <p className="lead">
              Em pouco mais de uma hora, Diego da Costa (MBA em Gestão, administrador e radialista)
              te conduz, com a própria voz, por um método prático para planejar a sua semana, definir
              metas que saem do papel e equilibrar carreira, saúde, relacionamentos e fé.
            </p>
            <div className="badges">
              <span className="badge">🎙️ Narrado pelo autor</span>
              <span className="badge">📱 Ouça onde quiser</span>
              <span className="badge">⚡ Acesso imediato</span>
            </div>
            <div className="hero-cta">
              <Link
                className="btn btn-compra"
                to={primaryRoute}
                onClick={() => trackBuyCta('diego_hero')}
              >
                {isEnrolled ? (
                  'Acessar audiobook'
                ) : (
                  <>
                    Quero o audiobook
                    <small>por apenas R$ {COURSE_PRICE_DISPLAY}</small>
                  </>
                )}
              </Link>
              <a className="btn btn-ghost" href="#amostra">
                ▶ Ouvir um trecho
              </a>
            </div>
            <p className="micro">🔒 Pagamento seguro pelo Mercado Pago · Pix ou cartão</p>
          </div>

          <div className="hero-foto">
            <div
              className="glow g-ciano"
              style={{ width: 300, height: 300, right: 0, top: '10%' }}
            />
            <div className="anel" />
            <picture data-tilt data-tilt-max="12">
              <source srcSet={`${ASSET_BASE}/diego-livro-recorte.webp`} type="image/webp" />
              <img
                src={`${ASSET_BASE}/diego-livro.jpg`}
                width={900}
                height={970}
                alt="Diego da Costa segurando o livro Como Planejar o Sucesso"
                fetchPriority="high"
              />
            </picture>
            <div className="flutua f1">
              <b>71 min</b>de conteúdo prático
            </div>
            <div className="flutua f2">
              <b>17 faixas</b>capítulos curtos
            </div>
          </div>
        </div>
      </header>

      <div className="faixa-info">
        <div className="wrap">
          <div className="box">
            <div className="it">
              <b>71 min</b>
              <span>de áudio</span>
            </div>
            <div className="it">
              <b>17</b>
              <span>faixas</span>
            </div>
            <div className="it">
              <b>5 passos</b>
              <span>para uma semana melhor</span>
            </div>
            <div className="it">
              <b>R$ {COURSE_PRICE_DISPLAY}</b>
              <span>pagamento único</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. AMOSTRA */}
      <section id="amostra">
        <div
          className="glow g-azul"
          style={{ width: 420, height: 420, left: -120, top: '20%' }}
        />
        <div className="wrap center">
          <span className="eyebrow">Ouça antes de comprar</span>
          <h2>
            Escute o Diego por <span className="grad">75 segundos</span>
          </h2>
          <p className="lead">Trecho do capítulo “Escolha a vida que deseja”.</p>
          <div className="player">
            <button
              type="button"
              className="player-btn"
              aria-label={isPlaying ? 'Pausar trecho' : 'Tocar trecho'}
              onClick={handleTogglePlay}
            >
              <svg viewBox="0 0 24 24">
                {isPlaying ? (
                  <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                ) : (
                  <path d="M8 5v14l11-7z" />
                )}
              </svg>
            </button>
            <div className="player-info">
              <b>Escolha a vida que deseja</b>
              <span>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <div className="ondas" onClick={handleWaveformClick} role="presentation">
                {WAVEFORM_BARS.map((height, idx) => (
                  <i
                    key={idx}
                    className={idx < activeBars ? 'on' : undefined}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
            <audio
              ref={audioRef}
              src={`${ASSET_BASE}/amostra-audiobook.mp3`}
              preload="none"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onLoadedMetadata={(e) => {
                if (e.currentTarget.duration) {
                  setDuration(e.currentTarget.duration);
                }
              }}
              onTimeUpdate={(e) => {
                setCurrentTime(e.currentTarget.currentTime);
                if (e.currentTarget.duration) {
                  setDuration(e.currentTarget.duration);
                }
              }}
            />
          </div>
        </div>
      </section>

      {/* 3. DOR */}
      <section className="alt">
        <div className="wrap narrow center">
          <span className="eyebrow">Você se reconhece?</span>
          <h2>
            O dia acaba e a <span className="grad">lista de tarefas não?</span>
          </h2>
          <p className="lead">
            Viver num mundo tão agitado é desafiador. O tempo foge, as responsabilidades se acumulam
            e o que é importante de verdade vai ficando para depois.
          </p>
        </div>
        <div className="wrap">
          <div className="dores">
            {PAIN_POINTS.map((text) => (
              <div className="card dor" key={text}>
                <span className="x">✕</span>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. A VIRADA */}
      <section>
        <div className="grid-bg" />
        <div
          className="glow g-azul"
          style={{ width: 500, height: 500, right: -160, top: 0 }}
        />
        <div className="wrap narrow center">
          <span className="eyebrow">A virada de chave do livro</span>
          <h2>
            Você não controla o tempo. <span className="grad">Mas administra o que faz nele.</span>
          </h2>
          <p className="lead">
            Não dá para criar mais horas no dia. A proposta do Diego é trocar a “gestão <i>do</i>{' '}
            tempo” pela “gestão <i>no</i> tempo”: uma mudança simples que muda tudo na sua agenda.
          </p>
        </div>
        <div className="wrap narrow">
          <div className="virada">
            <div className="card-v antes">
              <span className="big">DO tempo</span>
              Tentar controlar algo que ninguém controla.
            </div>
            <div className="seta">➜</div>
            <div className="card-v depois">
              <span className="big">NO tempo</span>
              Escolher, priorizar e agir no tempo que você tem.
            </div>
          </div>
        </div>
      </section>

      {/* 5. O QUE VOCÊ VAI APRENDER */}
      <section className="alt">
        <div
          className="glow g-ciano"
          style={{ width: 360, height: 360, left: -100, bottom: 0 }}
        />
        <div className="wrap">
          <div className="center narrow" style={{ margin: '0 auto' }}>
            <span className="eyebrow">O que você vai aprender</span>
            <h2>
              Do sonho à <span className="grad">agenda da semana</span>
            </h2>
          </div>
          <div className="grid-3">
            {BENEFITS.map((item) => (
              <div className="card benef" key={item.title}>
                <div className="ico">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
          <div className="center" style={{ marginTop: 44 }}>
            <Link
              className="btn btn-compra"
              to={primaryRoute}
              onClick={() => trackBuyCta('diego_beneficios')}
            >
              {isEnrolled ? 'Acessar audiobook' : 'Quero aprender esse método'}
            </Link>
          </div>
        </div>
      </section>

      {/* 6. PARA QUEM É (faixa branca inclinada) */}
      <div className="banda">
        <div className="in">
          <div className="wrap narrow">
            <span className="eyebrow">Para quem é</span>
            <h2>Este audiobook é para você se…</h2>
            <ul className="checks">
              {TARGET_AUDIENCE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 7. CONTEÚDO / SUMÁRIO */}
      <section>
        <div
          className="glow g-azul"
          style={{ width: 420, height: 420, right: -140, top: '30%' }}
        />
        <div className="wrap narrow">
          <div className="center">
            <span className="eyebrow">Conteúdo completo</span>
            <h2>
              17 faixas, <span className="grad">71 minutos</span>
            </h2>
            <p className="lead">
              Capítulos curtos para ouvir no carro, na academia ou entre um compromisso e outro.
            </p>
          </div>
          <div className="sumario">
            {TRACK_SECTIONS.map((group) => (
              <div key={group.part}>
                <div className="parte">{group.part}</div>
                {group.tracks.map((track) => (
                  <div className="faixa" key={track.num}>
                    <span>
                      <b>{track.num}</b>
                      {track.title}
                    </span>
                    <span>{track.duration}</span>
                  </div>
                ))}
              </div>
            ))}
            <div className="sumario-total">Duração total: aprox. 71 minutos</div>
          </div>
        </div>
      </section>

      {/* 8. AUTOR */}
      <section className="alt">
        <div className="grid-bg" />
        <div className="wrap autor-grid">
          <div className="autor-foto">
            <div className="anel" />
            <picture>
              <source srcSet={`${ASSET_BASE}/diego-palestra-recorte.webp`} type="image/webp" />
              <img
                src={`${ASSET_BASE}/diego-palestra.jpg`}
                width={900}
                height={910}
                alt="Diego da Costa palestrando com microfone"
                loading="lazy"
              />
            </picture>
          </div>
          <div>
            <span className="eyebrow">Quem é o autor</span>
            <h2>
              Diego <span className="grad">da Costa</span>
            </h2>
            <div className="tags">
              {AUTHOR_TAGS.map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
            <p className="lead">
              Profissional da Administração, empreendedor e comunicador, Diego dedica a carreira ao
              desenvolvimento humano e à gestão. No livro “Como Planejar o Sucesso”, ele reúne a
              experiência de anos ajudando pessoas e empresas a organizarem a agenda com realização,
              propósito, equilíbrio e resultado.
            </p>
            <p className="lead" style={{ marginTop: 14 }}>
              E, como radialista, ninguém melhor do que ele para narrar a própria obra.
            </p>
            <p className="micro">
              Instagram:{' '}
              <a
                href="https://instagram.com/diegodacosttadc"
                target="_blank"
                rel="noopener noreferrer"
              >
                @diegodacosttadc
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* 9. QUEM RECOMENDA */}
      <section>
        <div
          className="glow g-azul"
          style={{ width: 480, height: 480, left: '30%', top: '10%' }}
        />
        <div className="wrap">
          <div className="center narrow" style={{ margin: '0 auto' }}>
            <span className="eyebrow">Quem recomenda</span>
            <h2>
              O que dizem <span className="grad">sobre o livro</span>
            </h2>
          </div>
          <div className="quotes">
            {RECOMMENDATIONS.map((rec) => (
              <blockquote className="card quote" key={rec.author}>
                <p>{rec.quote}</p>
                <footer>
                  <b>{rec.author}</b>
                  {rec.role}
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* 10. OFERTA */}
      <section id="oferta" className="alt">
        <div className="grid-bg" />
        <div
          className="glow g-azul"
          style={{
            width: 600,
            height: 600,
            left: '50%',
            top: '20%',
            transform: 'translateX(-50%)',
          }}
        />
        <div className="wrap center">
          <span className="eyebrow">Oferta de lançamento</span>
          <h2>
            Comece hoje a <span className="grad">planejar o seu sucesso</span>
          </h2>
          <div className="oferta-grid">
            <div className="capa" aria-hidden="true" data-tilt data-tilt-max="18">
              <div className="brilho" />
              <div className="ondas-capa" />
              <span className="autor">Diego da Costa</span>
              <div className="tit">Como planejar o sucesso</div>
              <div className="sub">
                Estratégias poderosas para fazer o tempo trabalhar a seu favor
              </div>
              <span className="fone">🎧 AUDIOBOOK</span>
            </div>
            <div className="oferta">
              <h3>Audiobook “Como Planejar o Sucesso”</h3>
              <ul>
                {OFFER_ITEMS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="preco">
                <small>R$</small>
                <span>{COURSE_PRICE_DISPLAY}</span>
              </div>
              <Link
                className="btn btn-compra"
                to={primaryRoute}
                onClick={() => trackBuyCta('diego_oferta')}
              >
                {isEnrolled ? (
                  'Acessar audiobook agora'
                ) : (
                  <>
                    Comprar agora
                    <small>Pagamento seguro via Mercado Pago</small>
                  </>
                )}
              </Link>
              <div className="pagamentos">
                <span>🔒 Compra segura</span>
                <span>⚡ Pix</span>
                <span>💳 Cartão</span>
                <span>🎓 Área do aluno</span>
              </div>
              <div className="garantia">
                <div className="selo">7 DIAS DE GARANTIA</div>
                <p>
                  <b style={{ color: '#fff' }}>Risco zero.</b> Se em até 7 dias você sentir que o
                  audiobook não é para você, devolvemos 100% do valor. Sem perguntas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. CONTRATAR PALESTRA */}
      <section className="palestra" id="palestra">
        <div className="grid-bg" />
        <div className="wrap palestra-grid">
          <div>
            <span className="eyebrow">Para empresas e eventos</span>
            <h2>
              Leve o Diego <span className="grad">para a sua empresa</span>
            </h2>
            <p className="lead">
              Palestras e treinamentos sobre produtividade, planejamento e gestão no tempo para
              equipes, lideranças, associações e eventos.
            </p>
            <ul className="temas">
              {LECTURE_TOPICS.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
            <a
              className="btn btn-whats"
              href={PALESTRA_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackPalestraCta('diego_secao_palestra')}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3 2.4 1 2.9.8 3.4.7.5-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.5c-1.7 0-3.3-.4-4.8-1.3l-.3-.2-3.6.9 1-3.5-.2-.4C3.1 15.6 2.6 13.8 2.6 12 2.6 6.8 6.8 2.6 12 2.6S21.4 6.8 21.4 12 17.2 21.5 12 21.5zM12 .9C5.9.9.9 5.9.9 12c0 2 .5 3.9 1.5 5.6L.8 23.2l5.8-1.5c1.6.9 3.5 1.4 5.4 1.4 6.1 0 11.1-5 11.1-11.1S18.1.9 12 .9z" />
              </svg>
              Contratar palestra
            </a>
            <p className="micro">Você fala direto com a equipe pelo WhatsApp.</p>
          </div>
          <div className="autor-foto">
            <div className="anel" />
            <picture>
              <source srcSet={`${ASSET_BASE}/diego-livro-recorte.webp`} type="image/webp" />
              <img
                src={`${ASSET_BASE}/diego-livro.jpg`}
                width={900}
                height={970}
                alt="Diego da Costa em palestra"
                loading="lazy"
              />
            </picture>
          </div>
        </div>
      </section>

      {/* 12. FAQ */}
      <section>
        <div className="wrap narrow">
          <div className="center">
            <span className="eyebrow">Dúvidas frequentes</span>
            <h2>
              Perguntas <span className="grad">e respostas</span>
            </h2>
          </div>
          <div className="faq">
            {FAQ_ITEMS.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 13. CTA FINAL */}
      <section className="final">
        <div className="grid-bg" />
        <div className="wrap narrow center">
          <h2>
            Este não é o final. <span className="grad">É o início.</span>
          </h2>
          <p className="lead">
            “O início libertador do entendimento que a agenda é a principal causa de sucesso.” Dê o
            primeiro passo hoje.
          </p>
          <div className="final-actions">
            <Link
              className="btn btn-compra"
              to={primaryRoute}
              onClick={() => trackBuyCta('diego_final')}
            >
              {isEnrolled ? (
                'Acessar audiobook'
              ) : (
                <>
                  Quero o audiobook
                  <small>R$ {COURSE_PRICE_DISPLAY} · acesso imediato</small>
                </>
              )}
            </Link>
            <a
              className="btn btn-whats"
              href={PALESTRA_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackPalestraCta('diego_final')}
            >
              Contratar palestra
            </a>
          </div>
        </div>
      </section>

      {/* CTA fixo no celular */}
      <div className={`sticky ${showSticky ? 'on' : ''}`}>
        <span className="p">R$ {COURSE_PRICE_DISPLAY}</span>
        <Link
          className="btn btn-compra"
          to={primaryRoute}
          onClick={() => trackBuyCta('diego_sticky_mobile')}
        >
          {isEnrolled ? 'Acessar agora' : 'Comprar agora'}
        </Link>
      </div>
    </LpRoot>
  );
}
