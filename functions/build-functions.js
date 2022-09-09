const { exec } = require('child_process');
const fs = require('fs');

const execPromise = (cmd) => {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      if (stderr) {
        reject(stderr);
        return;
      }

      resolve(stdout);
    });
  })
};

console.log(`build:functions:${process.argv[2] ? `${process.argv[2]}:` : ''}start`);

if (process.argv[2] === 'for-prod' && fs.existsSync('lib')) {
  console.log('removing old generated lib');
  fs.rmSync('lib', {recursive: true, force: true});
  console.log('removed old generated lib');
}

console.log('lint: start');
return execPromise(`node tslint --project tsconfig.json`).then((stdout) => {

  if (stdout) {
    console.log(stdout);
  }

  console.log('lint:done');
  console.log('tsc:start');
  return execPromise(`tsc`);
}).then((stdout) => {

  if (stdout) {
    console.log(stdout);
  }

  console.log('tsc:done');

  if (process.argv[2] === 'for-prod') {
    return execPromise(`python minify.py`);
  }

  return Promise.resolve();
}).then((stdout) => {

  if (stdout) {
    console.log(stdout);
  }

  if (process.argv[2] === 'for-prod') {
    console.log('minify:done');
  }

  let cpEnvCmd = 'node cp-env.js for-emulator';

  if (process.argv[2] === 'for-prod') {
    cpEnvCmd = 'node cp-env.js';
  }

  return execPromise(cpEnvCmd);
}).then((stdout) => {

  if (stdout) {
    console.log(stdout);
  }

  console.log('build:functions:done');
}).catch((error) => {
  console.log(error);
});
