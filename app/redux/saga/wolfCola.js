/* eslint no-console: 0 */

/**
 * Everything to do with Howler is handled here. it doesn't necessary have
 * *direct* association with Redux store, but knows what sags to call
 */

import { eventChannel, END, delay } from 'redux-saga';
import { select, throttle, put, call, fork, take, takeLatest, takeEvery } from 'redux-saga/effects';
import { Howl } from 'howler';
import findIndex from 'lodash/fp/findIndex';
import random from 'lodash/fp/random';

import { PLAY, NEXT, PREVIOUS, SEEK } from 'app/redux/constant/wolfCola';

import { current } from 'app/redux/action/current';
import { queueSet, queueRemove } from 'app/redux/action/queue';
import { duration } from 'app/redux/action/duration';
import { playbackPosition } from 'app/redux/action/playbackPosition';
import { playing } from 'app/redux/action/playing';
import { initialQueue } from 'app/redux/action/initialQueue';
import { historyPush, historyFront } from 'app/redux/action/history';

const wolfCola = {
  playingKey: 'current',
  current: null,
  next: null,
  crossfadeInProgress: false,
};

// Howler `load` event will be yielded - so if it's never loaded
const promiseifyHowlEvent = (howl, eventName) => new Promise((resolve) => {
  if (howl !== null) {
    howl.once(eventName, (e) => {
      resolve(e);
    });
  }
});

// Emitter - we have PUT in the `end` callback
// 1. clearing if there's no _next_
// 2. passing playing key to the song that's fading in
const howlerEndChannel = key => eventChannel((emitter) => {
  wolfCola[key].once('end', (end) => {
    emitter({ end });
    emitter(END);
  });

  return () => {};
});

// checks if there's only one item in the history and the current play matches
// this behavior is taken from Apple Music
const playingLastHistory = s => s.history.length === 1 && s.current.songId === s.history[0].songId;

// Channel - listens to end either passes key to next or clears state to "no play"
function* howlerEnd(key) {
  const channel = yield call(howlerEndChannel, key);

  // we're only taking a single event i.e. { end }
  yield take(channel);
  wolfCola[wolfCola.playingKey].off();
  wolfCola[wolfCola.playingKey].unload();
  wolfCola[wolfCola.playingKey] = null;
  wolfCola.crossfadeInProgress = false;
  yield put({ type: NEXT });
}

function* play(action) {
  const state = yield select();
  const { payload } = action;

  // skipping state update on `ONE` or single song playlist
  if (state.current === null || state.current.songId !== payload.play.songId) {
    yield put(initialQueue(payload.initialQueue));
    yield put(queueSet(payload.queue));
    yield put(queueRemove(findIndex(song => song.songId === payload.play.songId)(payload.queue)));
    yield put(current(payload.play));
  }

  if (state.crossfade === 0) { // crossfade is off - clearing any Howl event
    if (wolfCola.current !== null) {
      wolfCola.current.off();
      wolfCola.current.unload();
      wolfCola.current = null;
    }

    if (wolfCola.next !== null) {
      wolfCola.next.off();
      wolfCola.next.unload();
      wolfCola.next = null;
    }
    // 👇 checking for crossfade and initializing. `state.crossfade` is true here
  } else if (wolfCola.crossfadeInProgress === false && state.playing === true) {
    if (wolfCola.current !== null) {
      wolfCola.crossfadeInProgress = true;
      wolfCola.current.fade(1, 0, (state.crossfade * 1000));
      wolfCola.current.once('fade', () => {
        wolfCola.current.off();
        wolfCola.current.unload();
        wolfCola.current = null;
        wolfCola.crossfadeInProgress = false;
      });
    }

    if (wolfCola.next !== null) {
      wolfCola.crossfadeInProgress = true;
      wolfCola.next.fade(1, 0, (state.crossfade * 1000));
      wolfCola.next.once('fade', () => {
        wolfCola.next.off();
        wolfCola.next.unload();
        wolfCola.next = null;
        wolfCola.crossfadeInProgress = false;
      });
    }
    // 👇 play triggered while crossfade in progress
  } else if (wolfCola.crossfadeInProgress === true && state.playing === true) {
    if (wolfCola.current !== null) {
      wolfCola.current.off();
      wolfCola.current.unload();
      wolfCola.current = null;
    }

    if (wolfCola.next !== null) {
      wolfCola.next.off();
      wolfCola.next.unload();
      wolfCola.next = null;
    }

    wolfCola.crossfadeInProgress = false;
  }

  // picking `playingKey`...
  if (wolfCola.current === null && wolfCola.next === null) {
    wolfCola.playingKey = 'current';
  } else {
    wolfCola.playingKey = wolfCola.current === null ? 'current' : 'next';
  }

  // playing the song - each song will have a Single Howler object that'll be
  // destroyed after each playback - loading all songs (i.e. queue can be costly - I think)
  // single Howler music approach:
  // - single song ID whenever it's called
  // - light [no preparation until asked]
  wolfCola[wolfCola.playingKey] = new Howl({
    src: [payload.play.songId],
    html5: true,
    autoplay: true,
  });

  // ethio-telecom
  wolfCola[wolfCola.playingKey].once('loaderror', () => {
    wolfCola.crossfadeInProgress = false;
    console.warn('Current song [loaderror], ላሽ ላሽ');
  });

  // if load doesn't resolve Wolf-Cola won't start
  yield promiseifyHowlEvent(wolfCola[wolfCola.playingKey], 'load');
  // music loaded, setting duration
  yield put(duration(wolfCola[wolfCola.playingKey].duration()));
  // setting playing - USING Howler object [autoplay]
  yield put(playing(wolfCola[wolfCola.playingKey].playing()));
  // fork for `end` lister [with channel]
  yield fork(howlerEnd, wolfCola.playingKey);

  // tracker...
  while (wolfCola[wolfCola.playingKey] !== null && wolfCola[wolfCola.playingKey].playing()) {
    // current playback progress
    yield put(playbackPosition(wolfCola[wolfCola.playingKey].seek()));

    if (wolfCola.crossfadeInProgress === false) {
      const stateCheck = yield select();

      // checking for crossfade threshold
      if ((stateCheck.duration - stateCheck.playbackPosition) <= stateCheck.crossfade) {
        yield put({ type: NEXT });
      }
    }

    yield call(delay, 1000);
  }
}

function* seek(action) {
  const { payload } = action;
  yield put(playbackPosition(payload));

  if (wolfCola[wolfCola.playingKey] !== null) {
    wolfCola[wolfCola.playingKey].seek(payload);
  }
}

function* next() {
  const state = yield select();

  // nothing playing - halting...
  if (state.playing === false) {
    return;
  }

  // repeat one whatever was playing...
  if (state.repeat === 'ONE') {
    yield put({
      type: PLAY,
      payload: {
        play: state.current,
        queue: state.queue,
        initialQueue: state.initialQueue,
      },
    });

    return;
  }

  // end of music - no music left; setting "no music" state...
  if (state.queue.length === 0 && state.repeat === 'OFF') {
    wolfCola[wolfCola.playingKey].off();
    wolfCola[wolfCola.playingKey].unload();
    wolfCola[wolfCola.playingKey] = null;

    yield put(duration(0));
    yield put(playbackPosition(0));
    yield put(playing(false));
    yield put(current(null));
    return;
  }

  // PUSH-ing song to history...
  if (state.current !== null) {
    const historyIndex = findIndex(song => song.songId === state.current.songId)(state.history);

    if (historyIndex === -1) {
      yield put(historyPush(state.current));
    } else {
      yield put(historyFront(historyIndex));
    }
  }

  // played through the entire queue and repeat is `ALL`
  if (state.queue.length === 0 && state.repeat === 'ALL') {
    const nextPlayIndex = state.shuffle ? random(0)(state.initialQueue.length - 1) : 0;

    yield put({
      type: PLAY,
      payload: {
        play: state.initialQueue[nextPlayIndex],
        queue: state.initialQueue,
        initialQueue: state.initialQueue,
      },
    });

    return;
  }

  // repeat is `OFF | ALL`, there are items in queue; picking next item according to shuffle...
  const nextPlayIndex = state.shuffle ? random(0)(state.queue.length - 1) : 0;
  yield put({
    type: PLAY,
    payload: {
      play: state.queue[nextPlayIndex],
      queue: state.queue,
      initialQueue: state.initialQueue,
    },
  });
}

function* previous() {
  const state = yield select();

  // nothing playing - halting...
  if (state.playing === false) {
    return;
  }

  // repeat `ONE`
  // previous triggered while crossfade > playbackPosition
  if (state.repeat === 'ONE' || state.crossfade > state.playbackPosition) {
    yield put({
      type: PLAY,
      payload: {
        play: state.current,
        queue: state.queue,
        initialQueue: state.initialQueue,
      },
    });

    return;
  }

  // history is empty || the current song being played is the same as the one item in history
  if (state.history.length === 0 || playingLastHistory(state)) {
    wolfCola[wolfCola.playingKey].off();
    wolfCola[wolfCola.playingKey].unload();
    wolfCola[wolfCola.playingKey] = null;

    yield put(duration(0));
    yield put(playbackPosition(0));
    yield put(playing(false));
    yield put(current(null));
    return;
  }

  // witchcraft!
  yield put({
    type: PLAY,
    payload: {
      play: state.history[0],
      queue: [state.history[0], ...state.queue],
      initialQueue: state.initialQueue,
    },
  });
}

function* watchPlay() {
  yield takeLatest(PLAY, play);
}

function* watchSeek() {
  yield throttle(250, SEEK, seek);
}

function* watchNext() {
  yield takeEvery(NEXT, next);
}

function* watchPrevious() {
  yield takeEvery(PREVIOUS, previous);
}

module.exports = {
  watchPlay,
  watchPrevious,
  watchNext,
  watchSeek,
};
