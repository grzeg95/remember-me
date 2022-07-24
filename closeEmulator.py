import subprocess, re

ports = ['9090', '4000', '9099', '5000', '5001', '9199', '4400', '4500', '9000']

result = subprocess.run("netstat -ano", capture_output=True, shell=True)
result = result.stdout.decode('utf-8').split("\r\n")

for line in result:

  # match ports
  for port in ports:
    if ':' + port in line:
      activeProcess = re.search(r'(?!(?:0))\d+$', line)
      if activeProcess:
        subprocess.run("taskkill /PID " + activeProcess.group() + " /F /T")
