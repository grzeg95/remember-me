exports.userWithRound = {
  fields: {
    roundsIds: ['0']
  },
  collections: {
    rounds: {
      '0': {
        collections: {
          tasks: {
            '1': {
              collections: {},
              fields: {
                days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
                description: 'My Task 1',
                timesOfDay: ['a', 'b', 'c']
              }
            },
            '2': {
              collections: {},
              fields: {
                days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
                description: 'My Task 2',
                timesOfDay: ['a', 'b', 'c', 'd', 'e', 'f']
              }
            }
          },
          todays: {
            mon: {
              collections: {
                todayTasks: {
                  '1': {
                    collections: {},
                    fields: {
                      description: 'My Task 1',
                      timesOfDay: {
                        a: false,
                        b: false,
                        c: false
                      }
                    }
                  },
                  '2': {
                    collections: {},
                    fields: {
                      description: 'My Task 2',
                      timesOfDay: {
                        a: false,
                        b: false,
                        c: false,
                        d: false,
                        e: false,
                        f: false
                      }
                    }
                  }
                }
              },
              fields: {
                todayTasksIds: ['1', '2']
              }
            },
            tue: {
              collections: {
                todayTasks: {
                  '1': {
                    collections: {},
                    fields: {
                      description: 'My Task 1',
                      timesOfDay: {
                        a: false,
                        b: false,
                        c: false
                      }
                    }
                  },
                  '2': {
                    collections: {},
                    fields: {
                      description: 'My Task 2',
                      timesOfDay: {
                        a: false,
                        b: false,
                        c: false,
                        d: false,
                        e: false,
                        f: false
                      }
                    }
                  }
                }
              },
              fields: {
                todayTasksIds: ['1', '2']
              }
            },
            wed: {
              collections: {
                todayTasks: {
                  '1': {
                    collections: {},
                    fields: {
                      description: 'My Task 1',
                      timesOfDay: {
                        a: false,
                        b: false,
                        c: false
                      }
                    }
                  },
                  '2': {
                    collections: {},
                    fields: {
                      description: 'My Task 2',
                      timesOfDay: {
                        a: false,
                        b: false,
                        c: false,
                        d: false,
                        e: false,
                        f: false
                      }
                    }
                  }
                }
              },
              fields: {
                todayTasksIds: ['1', '2']
              }
            },
            thu: {
              collections: {
                todayTasks: {
                  '1': {
                    collections: {},
                    fields: {
                      description: 'My Task 1',
                      timesOfDay: {
                        a: false,
                        b: false,
                        c: false
                      }
                    }
                  },
                  '2': {
                    collections: {},
                    fields: {
                      description: 'My Task 2',
                      timesOfDay: {
                        a: false,
                        b: false,
                        c: false,
                        d: false,
                        e: false,
                        f: false
                      }
                    }
                  }
                }
              },
              fields: {
                todayTasksIds: ['1', '2']
              }
            },
            fri: {
              collections: {
                todayTasks: {
                  '1': {
                    collections: {},
                    fields: {
                      description: 'My Task 1',
                      timesOfDay: {
                        a: false,
                        b: false,
                        c: false
                      }
                    }
                  },
                  '2': {
                    collections: {},
                    fields: {
                      description: 'My Task 2',
                      timesOfDay: {
                        a: false,
                        b: false,
                        c: false,
                        d: false,
                        e: false,
                        f: false
                      }
                    }
                  }
                }
              },
              fields: {
                todayTasksIds: ['1', '2']
              }
            },
            sat: {
              collections: {
                todayTasks: {
                  '1': {
                    collections: {},
                    fields: {
                      description: 'My Task 1',
                      timesOfDay: {
                        a: false,
                        b: false,
                        c: false
                      }
                    }
                  },
                  '2': {
                    collections: {},
                    fields: {
                      description: 'My Task 2',
                      timesOfDay: {
                        a: false,
                        b: false,
                        c: false,
                        d: false,
                        e: false,
                        f: false
                      }
                    }
                  }
                }
              },
              fields: {
                todayTasksIds: ['1', '2']
              }
            },
            sun: {
              collections: {
                todayTasks: {
                  '1': {
                    collections: {},
                    fields: {
                      description: 'My Task 1',
                      timesOfDay: {
                        a: false,
                        b: false,
                        c: false
                      }
                    }
                  },
                  '2': {
                    collections: {},
                    fields: {
                      description: 'My Task 2',
                      timesOfDay: {
                        a: false,
                        b: false,
                        c: false,
                        d: false,
                        e: false,
                        f: false
                      }
                    }
                  }
                }
              },
              fields: {
                todayTasksIds: ['1', '2']
              }
            }
          }
        },
        fields: {
          name: 'My Round',
          tasksIds: ['1', '2'],
          timesOfDay: ['a', 'b', 'c'],
          timesOfDayCardinality: [2, 2, 2, 1, 1, 1]
        }
      }
    }
  }
};
