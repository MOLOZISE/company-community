export interface RawArticle {
  title: string;
  link: string;
  summary: string;
  pubDate?: string;
  source: string;
  channelId: string;
  category: string;
}

export interface GeneratedPost {
  title: string;
  content: string;
  flair?: string;
  channelId: string;
  isAnonymous: boolean;
}

export interface PostResult {
  success: boolean;
  postId?: string;
  error?: string;
  articleLink: string;
}
