import multiprocessing as mp
import os
import threading
from multiprocessing.queues import JoinableQueue
import cursor
from typing import Union


def print_in_line(maybe_text: Union[str, int, float]) -> None:
  print(str(maybe_text), end='\r')


def print_progress(maybe_text: Union[str, int, float]) -> None:
  if type(maybe_text) is str:
    print_in_line('uglifyjs functions: {}   '.format(maybe_text))
  elif type(maybe_text) is int or type(maybe_text) is float:
    print_in_line('uglifyjs functions: {:.2f}%   '.format(maybe_text))


def re_maps_number_from_one_range_to_another(
  x: Union[int, float],
  in_min: Union[int, float],
  in_max: Union[int, float],
  out_min: Union[int, float],
  out_max: Union[int, float]
) -> float:
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min


def worker(q: JoinableQueue, q_init_size: int) -> None:
  for path in iter(q.get, None):
    print_progress(re_maps_number_from_one_range_to_another(q.qsize(), q_init_size, 0, 0, 100))
    os.system('uglifyjs {0} -c -o {0}'.format(path))
    print_progress(re_maps_number_from_one_range_to_another(q.qsize(), q_init_size, 0, 0, 100))
    q.task_done()


if __name__ == '__main__':

  cursor.hide()
  print_progress(0)

  queue = mp.JoinableQueue()

  for root, dirs, files in os.walk(os.path.join(os.getcwd(), 'lib')):
    for file in files:
      if file.endswith(".js"):
        queue.put(os.path.join(root, file))

  worker_count = mp.cpu_count()
  threads = [
    threading.Thread(target=worker, args=[queue, queue.qsize()], daemon=True)
    for _ in range(worker_count)
  ]

  for t in threads:  # start workers
    t.start()

  for _ in threads:  # signal workers to quit
    queue.put(None)

  for t in threads:  # wait until workers exit
    t.join()

  print_progress('done')
