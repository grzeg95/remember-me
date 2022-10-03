const child_process = require('child_process');
const spawn = child_process.spawn;
const readline = require('readline');
const os = require('os');
const platform = os.platform();
const ports = [4000, 9099, 5000, 9090, 4400, 4500];
let child;
const pids = new Set();
const portsToClosePromises = [];


// win32

if (platform === 'win32') {
  child = spawn('netstat -ano', [], {
    stdio: 'pipe',
    cwd: __dirname,
    shell: true
  });

  const rl = readline.createInterface({input: child.stdout});

  rl.on('line', (line) => {

    if (line === 'exit') {
      rl.close();
      return;
    }

    for (port of ports) {
      const portRegex = new RegExp(`:(${port})`);
      const portMatch = line.match(portRegex);

      if (portMatch && portMatch[0]) {

        const pidRegex = /(?!(?:0))\d+$/gm;
        const pid = line.match(pidRegex);

        if (pid && pid[0]) {

          if (!pids.has(pid[0])) {

            pids.add(pid[0]);
            portsToClosePromises.push(new Promise((resolve) => {

              spawn(`taskkill /PID ${pid[0]} /F /T`, [], {
                stdio: 'ignore',
                cwd: __dirname,
                shell: true
              }).on('exit', () => {
                resolve();
              });
            }));
          }
        }
      }
    }
  });

  child.on('exit', () => {
    rl.write('exit\r\n');
  });

  rl.on('close', () => {
    Promise.all(portsToClosePromises).then(() => {
      console.log('parts of firebase emulator have been closed');
    });
  });
}
