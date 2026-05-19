import type { Song } from '../types/session';

/** Catalog from Docs/SingFit_merged_mp3_songs.csv */
export const SONG_CATALOG: Song[] = [
  { id: '09', title: 'At Last', style: 'Etta James', filename: 'SingFit_20260516_AtLast.mp3' },
  { id: '01', title: 'Chain Of Fools', style: 'Aretha Franklin', filename: 'SingFit_20260516_ChainOfFools.mp3' },
  { id: '08', title: 'Georgia On My Mind', style: 'Ray Charles', filename: 'SingFit_20260516_GeorgiaOnMyMind.mp3' },
  { id: '10', title: 'Happy Trails', style: 'Roy Rogers', filename: 'SingFit_20260516_HappyTrails.mp3' },
  { id: '02', title: 'Have I Told You Lately', style: 'Gene Autry', filename: 'SingFit_20260516_HaveIToldYouLately.mp3' },
  { id: '11', title: "I'm Sorry", style: 'Brenda Lee', filename: 'SingFit_20260516_IamSorry.mp3' },
  { id: '12', title: 'I Fall To Pieces', style: 'Patsy Cline', filename: 'SingFit_20260516_IFallToPieces.mp3' },
  { id: '13', title: 'I Love Paris', style: 'Frank Sinatra', filename: 'SingFit_20260516_ILoveParis.mp3' },
  { id: '14', title: 'Just One Look', style: 'Doris Troy', filename: 'SingFit_20260516_JustOneLook.mp3' },
  { id: '15', title: 'Love Letters', style: 'Ketty Lester', filename: 'SingFit_20260516_LoveLetters.mp3' },
  { id: '07', title: 'Love Me Tender', style: 'Elvis Presley', filename: 'SingFit_20260516_LoveMeTender.mp3' },
  { id: '16', title: 'My Blue Heaven', style: 'Frank Sinatra', filename: 'SingFit_20260516_MyBlueHeaven.mp3' },
  { id: '17', title: 'My Way', style: 'Frank Sinatra', filename: 'SingFit_20260516_MyWay.mp3' },
  { id: '06', title: 'On Broadway', style: 'The Drifters', filename: 'SingFit_20260516_OnBroadway.mp3' },
  { id: '18', title: 'Ooo Baby Baby', style: 'Smokey Robinson & The Miracles', filename: 'SingFit_20260516_OooBabyBaby.mp3' },
  { id: '19', title: 'Stand By Your Man', style: 'Tammy Wynette', filename: 'SingFit_20260516_StandByYourMan.mp3' },
  { id: '03', title: "That's Life", style: 'Frank Sinatra', filename: 'SingFit_20260516_ThatsLife.mp3' },
  { id: '04', title: 'This Little Light Of Mine', style: 'Aretha Franklin', filename: 'SingFit_20260516_ThisLittleLightOfMine.mp3' },
  { id: '20', title: 'Treat Me Nice', style: 'Elvis Presley', filename: 'SingFit_20260516_TreatMeNice.mp3' },
  { id: '05', title: 'Wichita Lineman', style: 'Glen Campbell', filename: 'SingFit_20260516_WichitaLineman.mp3' },
];

export function songAudioUrl(song: Song): string {
  return `/songs/${encodeURIComponent(song.filename)}`;
}

export function pickRandomSong(excludeIds: string[] = []): Song {
  const pool = SONG_CATALOG.filter((s) => !excludeIds.includes(s.id));
  const list = pool.length > 0 ? pool : SONG_CATALOG;
  return list[Math.floor(Math.random() * list.length)]!;
}

export function pickFavoriteSongs(count = 7): Song[] {
  const shuffled = [...SONG_CATALOG].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
