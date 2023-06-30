const _spawn = require('child_process').spawn;
const fs = require('fs');
const path = require('path');

const exec = (text, textDone, promise) => {

  const logInline = (text) => {
   try {
     process.stdout.clearLine(0);
     process.stdout.cursorTo(0);
     process.stdout.write(text);
   } catch (e) {}
  };

  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'].map((char) => char + ' ');
  const lastFrameResolved = '• ';
  const lastFrameCaught = '⁈ ';
  let frameIndex = 0;

  const intervalId = setInterval(() => {

    let textToPush = '';
    textToPush += frames[frameIndex] + text;
    logInline(textToPush);

    frameIndex = ++frameIndex % frames.length;
  }, 100);

  return promise.then((code) => {
    clearInterval(intervalId);

    if (code !== 0) {
      logInline(lastFrameCaught + textDone);
    } else {
      logInline(lastFrameResolved + textDone);
    }

    return code;
  }).catch((code) => {
    clearInterval(intervalId);
    logInline(lastFrameCaught + textDone);
    return code;
  }).then((code) => {
    console.log();
    if (code !== 0) {
      process.exit(code);
    }
  });
};

const spawn = async (cmd, args, options) => {

  return new Promise((resolve, reject) => {

    let stdio = 'inherit';

    if (options?.stdio) {
      stdio = options?.stdio;
    }

    _spawn(cmd, args, {
      stdio,
      cwd: path.join(__dirname, '../'),
      shell: true
    }).on('error', (code) => {
      reject(code);
    }).on('exit', (code) => {
      resolve(code);
    });
  });
};

process.stdout.write('\u001B[?25l');

const run = async () => {
  console.log(`• build:functions:${process.argv[2] ? `${process.argv[2]}:` : ''}start`);

  if (process.argv[2] === 'for-prod' && fs.existsSync('lib')) {
    await exec('removing old lib', 'removed old lib', new Promise((resolve, reject) => {
      fs.rm('lib', {recursive: true, force: true}, (err) => {
        if (err) {
          reject(1);
        }
        resolve(0);
      });
    }));
  }

  await exec('lint', 'lint', spawn('node', ['tslint', '--project', 'tsconfig.json']));
  await exec('tsc', 'tsc', spawn('tsc', []));

  if (process.argv[2] === 'for-prod') {
    await exec('grunting', 'grunted', spawn('cd scripts && grunt', [], {
      stdio: 'ignore'
    }));
  }

  let cpEnvCmdArgs = ['cp-env.js', 'for-emulator'];

  if (process.argv[2] === 'for-prod') {
    cpEnvCmdArgs = ['cp-env.js'];
  }

  await exec('env coping', 'env copied', spawn('cd scripts && node', cpEnvCmdArgs));

  console.log(`• build:functions:${process.argv[2] ? `${process.argv[2]}:` : ''}done`);
};

run();
