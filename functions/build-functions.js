const _spawn = require('child_process').spawn;
const fs = require('fs');

const logSpinner = (text, textDone, promise) => {

  const frames = ['⠋', '⠙', '⠹','⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'].map((char) => char + ' ');
  const lastFrameResolved = '• ';
  const lastFrameCaught = '⁈ ';
  let frameIndex = 0;

  const intervalId = setInterval(() => {

    let textToPush = '';
    textToPush += frames[frameIndex] + text;
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(textToPush);

    frameIndex = ++frameIndex % frames.length;
  }, 100);

  return promise.then((r) => {
    clearInterval(intervalId);

    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(lastFrameResolved + textDone);

    console.log();
    return r;
  }).catch((e) => {
    clearInterval(intervalId);

    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(lastFrameCaught + textDone);

    console.log();
    throw e;
  });
};

const spawn = async (cmd, args, options) => {
  return new Promise((resolve) => {

    let stdio = 'inherit';

    if (options?.stdio) {
      stdio = options?.stdio;
    }

    _spawn(cmd, args, {
      stdio,
      cwd: __dirname,
      shell: true
    }).on('error', (error) => {
      console.log(error);
      process.exit(1);
    }).on('close', () => {
      resolve();
    });
  });
};

process.stdout.write('\u001B[?25l');

const run = async () => {
  console.log(`• build:functions:${process.argv[2] ? `${process.argv[2]}:` : ''}start`);

  if (process.argv[2] === 'for-prod' && fs.existsSync('lib')) {
    await logSpinner('removing old lib', 'removed old lib', new Promise((resolve, reject) => {
      fs.rm('lib', {recursive: true, force: true}, (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    }));
  }

  await logSpinner('lint', 'lint', spawn('node', ['tslint', '--project', 'tsconfig.json']));
  await logSpinner('tsc', 'tsc', spawn('tsc', []));

  if (process.argv[2] === 'for-prod') {
    await logSpinner('grunting', 'grunted', spawn('grunt', [], {
      stdio: 'ignore'
    }));
  }

  let cpEnvCmdArgs = ['cp-env.js', 'for-emulator'];

  if (process.argv[2] === 'for-prod') {
    cpEnvCmdArgs = ['cp-env.js'];
  }

  return logSpinner('env coping', 'env copied', spawn('node', cpEnvCmdArgs));
};

run().then(() => {
  console.log(`• build:functions:${process.argv[2] ? `${process.argv[2]}:` : ''}done`);
});
