/* eslint no-console: 0 */

// Congratulations!? you played yourself
// DJ K...

import React from 'react';
import { func, shape, bool, arrayOf } from 'prop-types';
import styled from 'emotion/react';
import { connect } from 'react-redux';

import { PLAY, TOGGLE_PLAY_PAUSE } from '@app/redux/constant/wolfCola';
import { human } from '@app/util/time';

import Song from '@app/component/presentational/Song';
import Divider from '@app/component/styled/Divider';
import Button from '@app/component/styled/Button';

const RecentContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 1em 2em;

  .mute {
    color: ${props => props.theme.controlMute};
  }

  .recently-played {
    display: flex;
    flex-direction: column;

    &__title {
      margin-bottom: -0.15em;
    }

    &__info {
      color: ${props => props.theme.controlMute};
    }

    &__button {
      width: 175px;
      margin-bottom: 1em;
    }
  }

  .song {
    flex: 1 1 auto;

    & > *:last-child {
      margin-bottom: 1px;
    }
  }
`;

const RecentlyPlayed = ({
  playing,
  current,
  history,
  initialQueue,
  togglePlayPauseHistory,
  togglePlayPauseSong,
}) => {
  if (history.length === 0) {
    return (
      <RecentContainer>
        <h1 style={{ marginBottom: '0' }}>ላሽ ላሽ  ¯\_(ツ)_/¯</h1>
        <h2 className="mute">You have no recently played songs...yet</h2>
      </RecentContainer>
    );
  }

  const {
    hours,
    minutes,
    seconds,
  } = human(history.reduce((totalDuration, song) => totalDuration + song.playtime, 0), true);
  // we can't use `sameSongList` here; we just can't
  // so "same" is detected with length + song id content
  let playingHistory = false;

  if (initialQueue.length === history.length) {
    const initialQueueSongIds = initialQueue.map(song => song.songId);
    const historySongIds = history.map(song => song.songId);
    playingHistory = historySongIds.every(songId => initialQueueSongIds.includes(songId));
  }

  return (
    <RecentContainer>
      <div className="recently-played">
        <h1 className="recently-played__title">Recently Played</h1>
        <p className="recently-played__info">{`${history.length} song${history.length > 1 ? 's' : ''}, ${hours > 0 ? `${hours} hr` : ''} ${minutes} min ${hours > 0 ? '' : `${seconds} sec`}`}</p>
        <Button className="recently-played__button" onClick={() => togglePlayPauseHistory(playing, playingHistory, history)}>{`${(playing && playingHistory) ? 'PAUSE' : 'PLAY'}`}</Button>
      </div>

      <Divider />

      <div className="song">
        { history.map((song, index) => <Song
          key={song.songId}
          currentSongId={current === null ? -1 : current.songId}
          trackNumber={index + 1}
          togglePlayPause={() => togglePlayPauseSong(index, song, current, history)}
          playing={playing && playingHistory}
          {...song}
        />) }
      </div>
    </RecentContainer>
  );
};

RecentlyPlayed.propTypes = {
  playing: bool,
  current: shape({
  }),
  history: arrayOf(shape({})),
  initialQueue: arrayOf(shape({})),
  togglePlayPauseHistory: func.isRequired,
  togglePlayPauseSong: func.isRequired,
};

RecentlyPlayed.defaultProps = {
  playing: false,
  current: null,
  history: [],
  initialQueue: [],
};

module.exports = connect(state => ({
  playing: state.playing,
  current: state.current,
  history: state.history,
  initialQueue: state.initialQueue,
}), dispatch => ({
  togglePlayPauseHistory(playing, playingHistory, history) {
    if (playing && playingHistory) {
      dispatch({
        type: TOGGLE_PLAY_PAUSE,
      });

      return;
    }

    dispatch({
      type: PLAY,
      payload: {
        play: history[0],
        queue: history,
        initialQueue: history,
      },
    });
  },

  togglePlayPauseSong(songIndex, song, current, history) {
    if (current === null || current.songId !== song.songId) {
      dispatch({
        type: PLAY,
        payload: {
          play: history[songIndex],
          queue: history,
          initialQueue: history,
        },
      });

      return;
    }

    dispatch({
      type: TOGGLE_PLAY_PAUSE,
    });
  },
}))(RecentlyPlayed);