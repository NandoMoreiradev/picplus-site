import { extractYoutubeId } from './youtube';

const ID = 'dQw4w9WgXcQ';

describe('extractYoutubeId', () => {
  it.each([
    ['link de vídeo', `https://www.youtube.com/watch?v=${ID}`],
    [
      'link com parâmetros extras',
      `https://www.youtube.com/watch?v=${ID}&t=42s&list=PL123`,
    ],
    ['sem www', `https://youtube.com/watch?v=${ID}`],
    ['mobile', `https://m.youtube.com/watch?v=${ID}`],
    ['link curto', `https://youtu.be/${ID}`],
    ['link curto com tempo', `https://youtu.be/${ID}?t=10`],
    ['Shorts', `https://www.youtube.com/shorts/${ID}`],
    ['Shorts com parâmetro', `https://youtube.com/shorts/${ID}?feature=share`],
    ['embed', `https://www.youtube.com/embed/${ID}`],
    ['embed sem cookies', `https://www.youtube-nocookie.com/embed/${ID}`],
    ['transmissão ao vivo', `https://www.youtube.com/live/${ID}`],
    ['sem protocolo', `youtube.com/watch?v=${ID}`],
    ['com espaços ao redor', `  https://youtu.be/${ID}  `],
    ['só o ID', ID],
  ])('aceita %s', (_label, input) => {
    expect(extractYoutubeId(input)).toBe(ID);
  });

  it.each([
    ['outro site', `https://vimeo.com/${ID}`],
    ['domínio parecido', `https://youtube.com.golpe.com/watch?v=${ID}`],
    [
      'domínio com youtube no caminho',
      `https://evil.com/youtube.com/watch?v=${ID}`,
    ],
    ['youtu.be falso', `https://youtu.be.evil.com/${ID}`],
    ['ID curto demais', 'https://youtu.be/abc'],
    ['ID com caracteres inválidos', 'https://youtu.be/<script>alert1</script>'],
    ['canal (sem vídeo)', 'https://www.youtube.com/@picplus'],
    ['playlist sem vídeo', 'https://www.youtube.com/playlist?list=PL123456'],
    ['javascript:', 'javascript:alert(1)'],
    ['vazio', ''],
    ['texto solto', 'meu vídeo do youtube'],
  ])('recusa %s', (_label, input) => {
    expect(extractYoutubeId(input)).toBeNull();
  });
});
