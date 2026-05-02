export const PLAYER_SEEK_EVENT = "pradotube:player-seek";
export const PLAYER_TIME_EVENT = "pradotube:player-time";

export interface SeekEventDetail {
  time: number;
}

export interface TimeEventDetail {
  time: number;
}

export function dispatchPlayerSeek(time: number) {
  window.dispatchEvent(
    new CustomEvent<SeekEventDetail>(PLAYER_SEEK_EVENT, { detail: { time } })
  );
}
