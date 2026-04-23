export const CHANNEL_LIST_QUERY = {
  // Keep this within the server-side zod max(100).
  limit: 100,
  offset: 0,
} as const;

export const BOARD_LIST_QUERY = {
  // Keep this within the server-side zod max(100).
  limit: 100,
  offset: 0,
  type: 'board' as const,
} as const;

export const SPACE_LIST_QUERY = {
  // Keep this within the server-side zod max(100).
  limit: 100,
  offset: 0,
  type: 'space' as const,
} as const;
