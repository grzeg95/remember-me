import multiprocessing as mp
import os
import threading
import cursor

def printInLine(text):
  print(str(text), end='\r')

def map(x, in_min, in_max, out_min, out_max):
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min

def worker(queue, size):
  for path in iter(queue.get, None):
    printInLine('uglifyjs functions: {:.2f}%   '.format(map(queue.qsize(), size, 0, 0, 100)))
    os.system('uglifyjs {0} -c -o {0}'.format(path))
    printInLine('uglifyjs functions: {:.2f}%   '.format(map(queue.qsize(), size, 0, 0, 100)))
    queue.task_done()

if __name__ == '__main__':

  cursor.hide()
  printInLine('uglifyjs functions: 0%\r')

  queue = mp.JoinableQueue()

  for root, dirs, files in os.walk(os.path.join(os.getcwd(), 'lib')):
    for file in files:
      if file.endswith(".js"):
        queue.put(os.path.join(root, file))

  worker_count = mp.cpu_count()
  threads = [threading.Thread(target=worker, args=[queue, queue.qsize()], daemon=True) for _ in range(worker_count)]

  for t in threads: # start workers
    t.start()

  for _ in threads:  # signal workers to quit
    queue.put(None)

  for t in threads:  # wait until workers exit
    t.join()

  # additional spaces to clear line
  #          ('uglifyjs functions: 99.99%\n')
  printInLine('uglifyjs functions: done  \n')
