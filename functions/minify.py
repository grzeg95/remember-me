import multiprocessing as mp
import os
import threading
from multiprocessing.queues import JoinableQueue
import cursor
from typing import Union
from observable import Observable
import sys

obs = Observable()
lock = threading.Lock()


@obs.on('progress')
def print_progress(message: str):
  sys.stdout.write('\r' + message)
  sys.stdout.flush()


def update_progress(maybe_text: Union[str, int, float], progress_to_update) -> None:

  with lock:

    if type(maybe_text) is str:
      progress_to_update[0] = maybe_text
      obs.trigger('progress', 'uglifyjs functions: {}   '.format(progress_to_update[0]))

    elif type(progress_to_update[0]) is not str and type(maybe_text) is int or type(maybe_text) is float:

      if maybe_text > progress_to_update[0]:

        progress_to_update[0] = maybe_text
        obs.trigger('progress', 'uglifyjs functions: {:.2f}%   '.format(maybe_text))


def re_maps_number_from_one_range_to_another(
  x: Union[int, float],
  in_min: Union[int, float],
  in_max: Union[int, float],
  out_min: Union[int, float],
  out_max: Union[int, float]
) -> float:
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min


def worker(q: JoinableQueue, progress_to_work_with) -> None:
  for path in iter(q.get, None):

    with open(path, 'r', encoding='utf8') as f:
      text = f.read().replace('\n', '')

    if 'exports.' in text or 'prototype.' in text:
      os.system('uglifyjs {0} -c -o {0}'.format(path))
    else:
      os.remove(path)

    update_progress(re_maps_number_from_one_range_to_another(q.qsize(), progress_to_work_with[1], 0, 0, 100), progress_to_work_with)
    q.task_done()


if __name__ == '__main__':

  cursor.hide()

  queue = mp.JoinableQueue()

  for root, dirs, files in os.walk(os.path.join(os.getcwd(), 'lib')):
    for file in files:
      if file.endswith(".js"):
        queue.put(os.path.join(root, file))

  progress = [0, queue.qsize()]
  update_progress(0, progress)

  worker_count = mp.cpu_count()
  threads = [
    threading.Thread(target=worker, args=[queue, progress], daemon=True)
    for _ in range(worker_count)
  ]

  for t in threads:  # start workers
    t.start()

  for _ in threads:  # signal workers to quit
    queue.put(None)

  for t in threads:  # wait until workers exit
    t.join()

  update_progress('done', progress)
