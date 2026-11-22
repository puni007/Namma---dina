import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const client = join(root, 'client');
const android = join(client, 'android');
const windows = process.platform === 'win32';
const npm = windows ? 'npm.cmd' : 'npm';
const npx = windows ? 'npx.cmd' : 'npx';

const isBundle = process.argv.includes('--bundle');
const isRelease = process.argv.includes('--release') || isBundle;

const buildEnv = {};
for (const file of ['.env.android', '.env.android.local', '.env.android.production']) {
  const path = join(client, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || line.trimStart().startsWith('#')) continue;
    buildEnv[match[1]] = match[2].replace(/^(["'])(.*)\1$/, '$2');
  }
}
for (const [key, value] of Object.entries(buildEnv)) process.env[key] ??= value;
const defaultSdk = windows && process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Android', 'Sdk') : undefined;
const sdkRoot = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT ?? defaultSdk;
if (sdkRoot && existsSync(join(sdkRoot, 'platform-tools'))) {
  process.env.ANDROID_HOME ??= sdkRoot;
  process.env.ANDROID_SDK_ROOT ??= sdkRoot;
}

function run(command, args, cwd) {
  const executable = windows ? (process.env.ComSpec ?? 'cmd.exe') : command;
  const parameters = windows ? ['/d', '/c', `${command} ${args.join(' ')}`] : args;
  const result = spawnSync(executable, parameters, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(npm, ['run', 'build:android', '--workspace', '@namma-dina/client'], root);
run(npx, ['cap', 'sync', 'android'], client);

const gradle = windows ? 'gradlew.bat' : './gradlew';
const task = isBundle ? 'bundleRelease' : (isRelease ? 'assembleRelease' : 'assembleDebug');

console.info(`\nRunning Gradle task: ${task}...`);
run(gradle, ['--no-daemon', '--max-workers=1', task], android);

if (isBundle) {
  const aab = join(android, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
  console.info(`\nRelease App Bundle (AAB) created: ${aab}`);
} else if (isRelease) {
  const apkDir = join(android, 'app', 'build', 'outputs', 'apk', 'release');
  console.info(`\nRelease APK build finished in: ${apkDir}`);
} else {
  const apk = join(android, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  if (!existsSync(apk)) throw new Error(`Gradle reported success but the APK was not created at ${apk}`);
  console.info(`\nDebug APK created: ${apk}`);
}
