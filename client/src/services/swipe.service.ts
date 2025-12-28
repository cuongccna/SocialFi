/**
 * Swipe API Service
 * Handles swipe actions (LIKE/PASS/SUPER)
 */

import { api } from '../api/axiosClient';
import type { SwipeAction, SwipeResult } from '../types';

interface SwipeApiResponse {
  success: boolean;
  data: SwipeResult;
}

interface SwipeOptions {
  isMystery?: boolean;
  isVip?: boolean;
}

/**
 * Record a swipe action
 * @param targetId - ID of the user being swiped
 * @param action - Type of swipe (LIKE/PASS/SUPER)
 * @param options - Additional options (isMystery, isVip)
 */
export async function recordSwipe(
  targetId: string,
  action: SwipeAction,
  options?: SwipeOptions
): Promise<SwipeResult> {
  const response = await api.post<SwipeApiResponse>('/swipe', {
    target_id: targetId,
    action,
    is_mystery: options?.isMystery || false,
  });

  return response.data;
}

/**
 * Swipe Right (LONG position)
 */
export async function swipeRight(
  targetId: string, 
  options?: SwipeOptions
): Promise<SwipeResult> {
  return recordSwipe(targetId, 'LIKE', options);
}

/**
 * Swipe Left (SHORT position)
 */
export async function swipeLeft(
  targetId: string,
  options?: SwipeOptions
): Promise<SwipeResult> {
  return recordSwipe(targetId, 'PASS', options);
}

/**
 * Super Swipe (boost)
 */
export async function superSwipe(
  targetId: string,
  options?: SwipeOptions
): Promise<SwipeResult> {
  return recordSwipe(targetId, 'SUPER', options);
}
