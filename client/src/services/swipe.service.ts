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

/**
 * Record a swipe action
 * @param targetId - ID of the user being swiped
 * @param action - Type of swipe (LIKE/PASS/SUPER)
 */
export async function recordSwipe(
  targetId: string,
  action: SwipeAction
): Promise<SwipeResult> {
  const response = await api.post<SwipeApiResponse>('/swipe', {
    target_id: targetId,
    action,
  });

  return response.data;
}

/**
 * Swipe Right (LONG position)
 */
export async function swipeRight(targetId: string): Promise<SwipeResult> {
  return recordSwipe(targetId, 'LIKE');
}

/**
 * Swipe Left (SHORT position)
 */
export async function swipeLeft(targetId: string): Promise<SwipeResult> {
  return recordSwipe(targetId, 'PASS');
}

/**
 * Super Swipe (boost)
 */
export async function superSwipe(targetId: string): Promise<SwipeResult> {
  return recordSwipe(targetId, 'SUPER');
}
