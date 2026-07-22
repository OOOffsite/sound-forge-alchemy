/**
 * Hooks Index
 *
 * @description Export all custom React hooks
 * @author Sound Forge Alchemy Team
 * @license MIT
 * @version 2.0.0
 */

export { useJobProgress } from './useJobProgress';
export type {
  JobStatus,
  JobProgressUpdate,
  UseJobProgressOptions,
  UseJobProgressReturn,
} from './useJobProgress';

export { useSupabase } from './useSupabase';
export type {
  SignInCredentials,
  UseSupabaseReturn,
} from './useSupabase';

export { useAudioPlayer } from './useAudioPlayer';
export type {
  AudioStems,
  UseAudioPlayerOptions,
  UseAudioPlayerReturn,
} from './useAudioPlayer';

export { useTracks } from './useTracks';
export type {
  Track,
  UseTracksOptions,
  UseTracksReturn,
} from './useTracks';
