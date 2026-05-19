/** Rotating lines above the song title on Eden's pick screen */
export const SONG_OFFER_KICKERS = [
  "I think you'd like this one",
  'How about this one?',
  "Here's another gem for you",
  "You're really picky,\nwhat do you think of this one?",
  'Still no? Maybe this one instead',
] as const;

export function songOfferKickerForOfferIndex(offerIndex: number): string {
  const i = ((offerIndex % SONG_OFFER_KICKERS.length) + SONG_OFFER_KICKERS.length) % SONG_OFFER_KICKERS.length;
  return SONG_OFFER_KICKERS[i];
}
