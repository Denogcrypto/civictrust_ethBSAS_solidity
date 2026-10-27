import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outputDir = path.dirname(fileURLToPath(import.meta.url));
const scenes = [
  {
    Number: '01', Image: '01-inicio.png', Seconds: 13, Title: 'Inicio',
    Text: 'Te presento CivicTrust, una demo local de presupuesto participativo. La idea es que los vecinos elijan prioridades barriales y que el recuento se pueda auditar.',
    Subtitle: 'Te presento CivicTrust, una demo local de presupuesto participativo.\nLa idea es que los vecinos elijan prioridades barriales\ny que el recuento se pueda auditar.',
  },
  {
    Number: '02', Image: '02-credencial.png', Seconds: 14, Title: 'Credencial privada',
    Text: 'Cada vecino crea o importa una identidad privada. Guarda el archivo secreto en su dispositivo y comparte con la comuna solo el compromiso público para pedir el alta en el padrón.',
    Subtitle: 'Cada vecino crea o importa una identidad privada.\nGuarda el archivo secreto en su dispositivo y comparte\nsolo el compromiso público para pedir el alta.',
  },
  {
    Number: '03', Image: '03-compromiso.png', Seconds: 12, Title: 'Compromiso público',
    Text: 'El compromiso público no es la credencial secreta. El vecino conserva su archivo privado; la comuna recibe solo el dato necesario para habilitarlo en el padrón.',
    Subtitle: 'El compromiso público no es la credencial secreta.\nEl vecino conserva su archivo privado; la comuna recibe\nsolo el dato necesario para habilitarlo en el padrón.',
  },
  {
    Number: '04', Image: '04-panel-padron.png', Seconds: 14, Title: 'Padrón comunal',
    Text: 'El administrador agrega los compromisos públicos al padrón, sin asociarlos a nombres o direcciones. Esta demo no valida DNI ni identidad civil; usa identidades de prueba.',
    Subtitle: 'El administrador agrega compromisos públicos al padrón,\nsin asociarlos a nombres o direcciones. Esta demo no valida\nDNI ni identidad civil; usa identidades de prueba.',
  },
  {
    Number: '05', Image: '05-panel-consulta.png', Seconds: 14, Title: 'Publicar consulta',
    Text: 'Desde el panel también se publica una consulta: se define el título, la descripción, las opciones y la duración. Luego aparece en la página principal.',
    Subtitle: 'Desde el panel se publica una consulta: se define el título,\nla descripción, las opciones y la duración. Luego aparece\nen la página principal.',
  },
  {
    Number: '06', Image: '06-votacion-resultados.png', Seconds: 18, Title: 'Voto y verificación',
    Text: 'El vecino habilitado selecciona una opción y envía su voto. Semaphore genera una prueba de conocimiento cero: el contrato verifica que pertenece al padrón sin revelar su identidad y evita un segundo voto en la consulta.',
    Subtitle: 'El vecino habilitado selecciona una opción y envía su voto.\nSemaphore genera una prueba de conocimiento cero; el contrato\nverifica el padrón sin revelar su identidad ni aceptar otro voto.',
  },
  {
    Number: '07', Image: '07-cierre.png', Seconds: 13, Title: 'Escrutinio público',
    Text: 'El escrutinio se muestra públicamente desde la blockchain local. En esta consulta de ejemplo hay un voto registrado para mejorar la iluminación.',
    Subtitle: 'El escrutinio se muestra públicamente desde la blockchain local.\nEn esta consulta de ejemplo hay un voto para mejorar\nla iluminación.',
  },
  {
    Number: '08', Image: '01-inicio.png', Seconds: 16, Title: 'Alcance del MVP',
    Text: 'El alcance actual es una demo local: no está conectada con miBA, DNI ni un padrón real. El seguimiento de fondos y obras aparece como una etapa futura. CivicTrust propone una base para decisiones comunales más transparentes y auditables. Gracias.',
    Subtitle: 'El MVP es local: no se conecta con miBA, DNI ni un padrón real.\nEl seguimiento de fondos y obras queda para una etapa futura.\nCivicTrust propone decisiones comunales más transparentes. Gracias.',
  },
];

fs.writeFileSync(path.join(outputDir, 'scenes.json'), `${JSON.stringify(scenes, null, 2)}\n`, 'utf8');
const transcript = [
  '# CivicTrust — guion del video',
  '',
  'El video tiene locución en español y presenta estos textos como subtítulos en pantalla.',
  '',
  ...scenes.flatMap((scene) => [`## Escena ${scene.Number}: ${scene.Title}`, '', scene.Text, '']),
].join('\n');
fs.writeFileSync(path.join(outputDir, 'GUION_VIDEO_CIVICTRUST.md'), transcript, 'utf8');
