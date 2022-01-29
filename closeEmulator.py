import subprocess, re

result = subprocess.run("netstat -ano | findstr :9090", capture_output=True, shell=True)
result = result.stdout.decode('utf-8').split("\r\n")

for line in result:
  activeProcess = re.search(r'(?!(?:0))\d+$', line)
  if activeProcess:
    subprocess.run("taskkill /PID " + activeProcess.group() + " /F")
