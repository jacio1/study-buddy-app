export interface User {
  id: string;
  email: string;
  user_metadata: { full_name?: string };
}

export interface Profile {
  id: string;
  full_name: string;
  bio: string | null;
  avatar_url?: string | null;
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
  initiated_by: string | null;
  /** pending_confirmation → active → pending_deletion → completed */
  status: 'pending_confirmation' | 'active' | 'pending_deletion' | 'completed';
  created_at: string;
  completed_at: string | null;
  delete_requested_by: string | null;
  delete_requested_at: string | null;
  delete_confirmed_by: string | null;
  auto_delete_at: string | null;
  study_listings?: StudyListing;
}

export interface Message {
  id: string;
  session_id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
  profiles?: Profile;
}

export interface DirectConversation {
  id: string;
  user1_id: string;
  user2_id: string;
  listing_id: string | null;
  created_at: string;
  last_message_at: string;
  listing?: StudyListing;
  other_user?: Profile;
  last_message?: DirectMessage;
  unread_count?: number;
  session?: StudySession | null;
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  profiles?: Profile;
}