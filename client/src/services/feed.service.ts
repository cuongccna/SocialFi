/**
 * Feed API Service
 * Handles fetching nearby profiles for swiping
 */

import { api } from '../api/axiosClient';
import type { FeedUser } from '../types';

/**
 * Get feed of nearby users
 * @param latitude - Current user latitude
 * @param longitude - Current user longitude
 * @param radius - Search radius in km (default 10)
 * @param limit - Max number of profiles to return (default 20)
 */
export async function getFeed(
  latitude?: number,
  longitude?: number,
  radius: number = 10,
  limit: number = 20
): Promise<FeedUser[]> {
  const params: Record<string, any> = {
    radius,
    limit,
  };

  // Use lat/lng as backend expects
  if (latitude) params.lat = latitude;
  if (longitude) params.lng = longitude;

  const response = await api.get<{ success: boolean; users: FeedUser[] }>(
    '/feed',
    { params }
  );

  return response.users || [];
}

/**
 * Refresh feed - get new batch of users
 */
export async function refreshFeed(
  latitude?: number,
  longitude?: number,
  radius: number = 10
): Promise<FeedUser[]> {
  return getFeed(latitude, longitude, radius, 20);
}
