import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const outputDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(outputDir, '..', '..', '..');
const scenesFile = path.join(outputDir, 'scenes.json');
const raw = fs.readFileSync(scenesFile, 'utf8').replace(/^\uFEFF/, '');
const scenes = JSON.parse(raw);
if (scenes.length < 2) throw new Error('El video necesita al menos dos escenas.');

const ffmpeg = 'C:\\Users\\Denis\\Downloads\\ffmpeg-8.1-essentials_build\\ffmpeg-8.1-essentials_build\\bin\\ffmpeg.exe';
const ffprobe = 'C:\\Users\\Denis\\Downloads\\ffmpeg-8.1-essentials_build\\ffmpeg-8.1-essentials_build\\bin\\ffprobe.exe';
const outputPath = path.join(projectDir, 'CIVICTRUST_VIDEO_MVP.mp4');
const subtitlePath = path.join(projectDir, 'CIVICTRUST_VIDEO_MVP.srt');
const fade = 0.35;
const voiceDelay = 0.35;

const getDuration = (filePath) => new Promise((resolve, reject) => {
  const child = spawn(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', filePath], { windowsHide: true });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', reject);
  child.on('close', (code) => {
    const duration = Number(stdout.trim());
    if (code !== 0 || !Number.isFinite(duration) || duration <= 0) reject(new Error(`No se pudo leer la duración de ${filePath}: ${stderr}`));
    else resolve(duration);
  });
});

const voiceFiles = scenes.map((scene) => path.join(outputDir, `voz-${scene.Number}.wav`));
for (const voiceFile of voiceFiles) if (!fs.existsSync(voiceFile)) throw new Error(`Falta la locución ${path.basename(voiceFile)}.`);
const voiceDurations = await Promise.all(voiceFiles.map(getDuration));
const sceneDurations = scenes.map((scene, index) => Math.max(scene.Seconds, voiceDurations[index] + voiceDelay + 0.55));

const fmtSrt = (seconds) => {
  const ms = Math.round(seconds * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const milli = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(milli).padStart(3, '0')}`;
};
const fmtAss = (seconds) => {
  const cs = Math.round(seconds * 100);
  const h = Math.floor(cs / 360_000);
  const m = Math.floor((cs % 360_000) / 6_000);
  const s = Math.floor((cs % 6_000) / 100);
  const centiseconds = cs % 100;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
};
const escapeAss = (text) => text.replaceAll('\\', '\\\\').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('\n', '\\N');

const srt = [];
const assEvents = [];
let sceneStart = 0;
for (const [index, scene] of scenes.entries()) {
  const captionStart = sceneStart + (index === 0 ? 0.45 : fade + 0.12);
  const captionEnd = sceneStart + sceneDurations[index] - 0.38;
  srt.push(String(index + 1), `${fmtSrt(captionStart)} --> ${fmtSrt(captionEnd)}`, scene.Subtitle, '');
  assEvents.push(`Dialogue: 0,${fmtAss(captionStart)},${fmtAss(captionEnd)},Default,,0,0,0,,${escapeAss(scene.Subtitle)}`);
  sceneStart += sceneDurations[index] - (index < scenes.length - 1 ? fade : 0);
}
fs.writeFileSync(subtitlePath, srt.join('\r\n'), 'utf8');

const ass = [
  '[Script Info]',
  'ScriptType: v4.00+',
  'PlayResX: 1280',
  'PlayResY: 720',
  'WrapStyle: 2',
  'ScaledBorderAndShadow: yes',
  '',
  '[V4+ Styles]',
  'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
  'Style: Default,Arial,22,&H00FFFFFF,&H0000FFFF,&H80102A43,&H80102A43,1,0,0,0,100,100,0,0,3,1,0,2,72,72,32,1',
  '',
  '[Events]',
  'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ...assEvents,
  '',
].join('\r\n');
fs.writeFileSync(path.join(outputDir, 'subtitles.ass'), ass, 'utf8');

const args = ['-y', '-hide_banner', '-loglevel', 'info', '-stats_period', '3'];
for (const [index, scene] of scenes.entries()) {
  const imagePath = path.join(outputDir, scene.Image);
  if (!fs.existsSync(imagePath)) throw new Error(`Falta la captura ${scene.Image}.`);
  args.push('-loop', '1', '-framerate', '24', '-t', String(sceneDurations[index]), '-i', imagePath);
}
for (const voiceFile of voiceFiles) args.push('-i', voiceFile);

const filterParts = [];
for (let index = 0; index < scenes.length; index += 1) {
  filterParts.push(`[${index}:v]scale=1280:720:flags=fast_bilinear,setsar=1,format=yuv420p[v${index}]`);
}
let prior = 'v0';
let priorDuration = sceneDurations[0];
for (let index = 1; index < scenes.length; index += 1) {
  const next = `xf${index}`;
  const offset = priorDuration - fade;
  filterParts.push(`[${prior}][v${index}]xfade=transition=fade:duration=${fade}:offset=${offset.toFixed(2)}[${next}]`);
  prior = next;
  priorDuration += sceneDurations[index] - fade;
}
filterParts.push(`[${prior}]ass=filename=subtitles.ass[vout]`);
const audioLabels = [];
for (let index = 0; index < scenes.length; index += 1) {
  const inputIndex = scenes.length + index;
  const segmentDuration = sceneDurations[index] - (index < scenes.length - 1 ? fade : 0);
  const fadeStart = Math.max(voiceDelay, segmentDuration - 0.18);
  const label = `a${index}`;
  filterParts.push(`[${inputIndex}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,adelay=${Math.round(voiceDelay * 1000)}|${Math.round(voiceDelay * 1000)},apad,atrim=duration=${segmentDuration.toFixed(3)},afade=t=out:st=${fadeStart.toFixed(3)}:d=0.18[${label}]`);
  audioLabels.push(`[${label}]`);
}
filterParts.push(`${audioLabels.join('')}concat=n=${scenes.length}:v=0:a=1[aout]`);
args.push(
  '-filter_complex', filterParts.join(';'),
  '-map', '[vout]', '-map', '[aout]', '-r', '24', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '22',
  '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', '-metadata', 'title=CivicTrust — recorrido del MVP',
  '-metadata', 'comment=Video con voz en español y subtítulos; demo local con identidades de prueba',
  outputPath,
);

console.log(`Renderizando ${outputPath}`);
const child = spawn(ffmpeg, args, { cwd: outputDir, stdio: 'inherit', windowsHide: true });
const exitCode = await new Promise((resolve, reject) => {
  child.on('error', reject);
  child.on('close', resolve);
});
if (exitCode !== 0) throw new Error(`FFmpeg terminó con código ${exitCode}.`);
console.log(`Video listo. Subtítulos: ${subtitlePath}`);
