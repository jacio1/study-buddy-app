export interface User {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
  };
}

export interface Profile {
  id: string;
  full_name: string;
  bio: string | null;
  created_at: string;
}

export interface StudyListing {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  category: string;
  description: string;
  level: string;
  schedule: string;
  format: 'online' | 'offline' | 'any';
  city: string | null;
  created_at: string;
  profiles?: Profile;
}

export interface StudySession {
  id: string;
  listing_id: string;
  creator_id: string;
  partner_id: string;
  status: 'active' | 'completed';
  created_at: string;
  study_listings?: StudyListing;
}

export interface Message {
  id: string;
  session_id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  file_url:  string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
  profiles?: Profile;
}