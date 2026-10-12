let playing: HTMLAudioElement | undefined;

/** Claims playback when an audio element starts, pausing the previously registered element. */
export const claimAudioPlayback = (audio: HTMLAudioElement) => {
	if (playing && playing !== audio) playing.pause();
	playing = audio;
};

/** Releases an audio element on cleanup, pausing it and clearing its source. */
export const releaseAudioPlayback = (audio: HTMLAudioElement) => {
	audio.pause();
	audio.removeAttribute("src");
	audio.load();
	if (playing === audio) playing = undefined;
};
