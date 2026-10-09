/**
 * Conteúdo da página do PicCast.
 *
 * Para trocar um episódio, edite `episodes`: `videoId` é o código depois de `v=` na URL do YouTube
 * (ex.: https://www.youtube.com/watch?v=v6CHdiGkC44 → 'v6CHdiGkC44'). A página exibe até 6.
 */
export const piccast = {
  channelUrl: 'https://www.youtube.com/@PicplusCompany/podcasts',
  closing:
    'Inscreva-se agora e faça parte desta jornada épica. Prepare-se para superar desafios, abraçar oportunidades e, acima de tudo, trilhar o caminho do empreendedorismo com resiliência e paixão.',
  episodes: [
    { videoId: 'EA26MyWHsWE', number: 35, title: 'Gonzaga Hipermercado: os bastidores do sucesso' },
    { videoId: 'VwXP5ISJTZA', number: 4, title: 'Como expandir seu negócio e transformar em uma rede' },
    { videoId: 'vuSAAUjfJoc', title: 'Os bastidores do agronegócio' },
    { videoId: 'yeu_Gx3idg8', number: 1, title: 'Vanderson Rocha Carnes' },
    { videoId: 'FsoGQtc8WdM', number: 20, title: 'Transformando desafios em oportunidades: a gestão no varejo e atacado', guest: 'Juliano César',},
    { videoId: '810QT78dtFg', number: 5, title: 'Desenvolvimento de liderança e gestão de talentos' },
  ] as { videoId: string; number?: number; title: string; guest?: string }[],
};
