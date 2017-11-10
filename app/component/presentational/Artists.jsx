import React from 'react';
import { Link } from 'react-router-dom';
import { func, string, number, shape, bool, arrayOf } from 'prop-types';
import styled from 'react-emotion';

import { BASE_S3 } from '@app/config/api';

import FixedHeaderList from '@app/component/styled/FixedHeaderList';
import PlayPauseSVG from '@app/component/presentational/PlayPauseSVG';
import Button from '@app/component/styled/Button';

import Artist from '@app/component/presentational/Artist';

const ArtistsContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;

  &.center-content {
    flex: 1 0 auto;
    justify-content: center;
    align-items: center;
  }

  .mute {
    color: ${props => props.theme.controlMute};
  }
`;

const ArtistContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 0 0 25%;
  padding: 0 1em;
  align-items: center;
  text-decoration: none;
  margin-bottom: 2em;
  color: #fff;

  &.active {
    color: ${props => props.theme.primary};

    .artist-name {
      color: ${props => props.theme.primary};
    }
  }

  &:not(.active) {
    svg {
      color: #fff !important;
    }
  }

  @media(min-width: 1282px) {
    flex: 0 0 20%;
  }

  .artist {
    position: relative;
    width: 92%;

    &__image {
      width: 100%;
      height: auto;
      border-radius: 50%;
      border: 1px solid ${props => props.theme.listDivider};
    }

    &__overlay {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 3px;
      left: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: rgba(51, 51, 51, 0.75);
      border-radius: 50%;
      color: inherit;
      border: 1px solid ${props => props.theme.listDivider};

      svg {
        display: flex;
        justify-content: center;
        align-items: center;
        color: inherit;
        font-size: 80px;
        width: 80px;
        height: 80px;
      }
    }

    .artist__overlay {
      opacity: 0;
    }

    &:hover .artist__overlay {
      opacity: 1;
    }
  }

  .artist-name {
    padding: 0;
    margin: 0;
    line-height: 125%;
    margin-top: 0.5em;
    font-size: 1.25em;
    color: ${props => props.theme.listText};
  }

  &:active {
    transform: scale(0.95);
  }
`;

const Artists = ({
  current,
  playing,
  artistId,
  user,
  artists,
  trackCount,
  albumPlayingId,
  artistPlayingId,
  artistsPlayPause,
  artistPlayPause,
  trackPlayPause,
  albumPlayPause,
  contextMenuArtist,
  contextMenuAlbum,
  contextMenuTrack,
}) => {
  if (user === null) {
    return (
      <ArtistsContainer className="center-content">
        <h2 className="mute">You need to be logged in to view saved artists</h2>
        <Link to="/setting"><Button outline>Go to Settings</Button></Link>
      </ArtistsContainer>
    );
  }

  if (artists.length === 0) {
    return (
      <ArtistsContainer className="center-content">
        <h2 className="mute">You have no saved artists...yet</h2>
      </ArtistsContainer>
    );
  }

  if (artistId !== undefined && artists.length === 1) {
    return (
      <Artist
        artist={artists[0]}
        current={current}
        playing={playing}
        aristPlaying={artistPlayingId === artists[0].artist_id}
        trackCount={trackCount}
        albumPlayingId={albumPlayingId}
        playingArist={false}
        artistPlayPause={artistPlayPause}
        trackPlayPause={trackPlayPause}
        albumPlayPause={albumPlayPause}
        contextMenuArtist={contextMenuArtist}
        contextMenuAlbum={contextMenuAlbum}
        contextMenuTrack={contextMenuTrack}
      />
    );
  }

  return (
    <FixedHeaderList>
      <div className="title">
        <h2>Artists</h2>
      </div>

      <div className="list">
        {
          artists.map(artist => (
            <ArtistContainer className={artist.artist_id === artistPlayingId ? 'active' : ''}>
              <div className="artist">
                <img alt={`${artist.artist_name}`} className="artist__image" src={`${BASE_S3}${artist.artist_cover.s3_name}`} />
                <Link to={`/artists/${artist.artist_id}`} className="artist__overlay">
                  <PlayPauseSVG
                    onClick={(e) => { e.preventDefault(); artistsPlayPause(artist.artist_id); }}
                    playing={playing && artist.artist_id === artistPlayingId}
                  />
                </Link>
              </div>

              <strong className="artist-name">{ artist.artist_name }</strong>
            </ArtistContainer>
          ))
        }
      </div>
    </FixedHeaderList>
  );
};

Artists.propTypes = {
  artistId: string,
  current: shape({}),
  user: shape({}),
  artists: arrayOf(shape({})),
  playing: bool,
  albumPlayingId: string,
  trackCount: number,
  artistPlayingId: string,
  artistsPlayPause: func.isRequired,
  artistPlayPause: func.isRequired,
  trackPlayPause: func.isRequired,
  albumPlayPause: func.isRequired,
  contextMenuArtist: func.isRequired,
  contextMenuAlbum: func.isRequired,
  contextMenuTrack: func.isRequired,
};

Artists.defaultProps = {
  artistId: '',
  current: null,
  user: null,
  artists: [],
  playing: false,
  artistPlayingId: '',
  albumPlayingId: '',
  trackCount: 0,
};

module.exports = Artists;