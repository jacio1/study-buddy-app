"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Profile,
  User,
  StudyListing,
  StudySession,
  Message,
} from "../types/types";
import { supabase } from "../lib/supabase";
import { Button } from "@/components/ui/button";
import { DoorOpen, SquareArrowRightExit } from "lucide-react";

type Page = "auth" | "home" | "create-listing" | "listing-detail" | "session";

export default function StudyBuddyApp() {
  const [currentPage, setCurrentPage] = useState<Page>("auth");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedListing, setSelectedListing] = useState<StudyListing | null>(
    null,
  );
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(
    null,
  );

  useEffect(() => {
    // Проверка текущей сессии
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user as User);
        loadProfile(session.user.id);
        setCurrentPage("home");
      }
    });

    // Подписка на изменения аутентификации
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user as User);
        loadProfile(session.user.id);
        setCurrentPage("home");
      } else {
        setUser(null);
        setProfile(null);
        setCurrentPage("auth");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) setProfile(data);
  };

  const navigate = (page: Page, data?: any) => {
    setCurrentPage(page);
    if (page === "listing-detail" && data) {
      setSelectedListing(data);
    }
    if (page === "session" && data) {
      setSelectedSession(data);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700;900&display=swap');
        
        * {
          box-sizing: border-box;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        
        .slide-in {
          animation: slideIn 0.4s ease-out;
        }
        
        .card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
        }
        
        .card:hover {
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
          transform: translateY(-2px);
        }
        
        input, textarea, select {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e8d5c4;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          transition: all 0.2s ease;
          background: white;
        }
        
        input:focus, textarea:focus, select:focus {
          outline: none;
          border-color: #f582ae;
          box-shadow: 0 0 0 3px rgba(245, 130, 174, 0.1);
        }
        
        button {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #f582ae 0%, #e8505b 100%);
          color: white;
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(245, 130, 174, 0.4);
        }
        
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .btn-secondary {
          background: white;
          color: #001858;
          border: 2px solid #e8d5c4;
        }
        
        .btn-secondary:hover {
          background: #fef6e4;
          border-color: #f582ae;
        }
        
        .scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        
        .scrollbar::-webkit-scrollbar-track {
          background: #fef6e4;
          border-radius: 4px;
        }
        
        .scrollbar::-webkit-scrollbar-thumb {
          background: #f582ae;
          border-radius: 4px;
        }
        
        .scrollbar::-webkit-scrollbar-thumb:hover {
          background: #e8505b;
        }
      `}</style>

      {currentPage === "home" && (
        <HomePage user={user} profile={profile} onNavigate={navigate} />
      )}
      {currentPage === "create-listing" && (
        <CreateListingPage user={user} onNavigate={navigate} />
      )}
      {currentPage === "listing-detail" && (
        <ListingDetailPage
          listing={selectedListing}
          user={user}
          onNavigate={navigate}
        />
      )}
      {currentPage === "session" && (
        <SessionPage
          session={selectedSession}
          user={user}
          onNavigate={navigate}
        />
      )}
    </div>
  );
}

// Главная страница со списком объявлений
function HomePage({
  user,
  profile,
  onNavigate,
}: {
  user: User | null;
  profile: Profile | null;
  onNavigate: (page: Page, data?: any) => void;
}) {
  const [listings, setListings] = useState<StudyListing[]>([]);
  const [mySessions, setMySessions] = useState<StudySession[]>([]);

  useEffect(() => {
    loadListings();
    loadMySessions();
  }, []);

  const loadListings = async () => {
    const { data } = await supabase
      .from("study_listings")
      .select("*, profiles(*)")
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) setListings(data);
  };

  const loadMySessions = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("study_sessions")
      .select("*, study_listings(*)")
      .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (data) setMySessions(data);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "40px",
          paddingTop: "20px",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "2.5rem",
              color: "#001858",
              margin: 0,
            }}
          >
            StudyMate
          </h1>
          <p style={{ color: "#666", marginTop: "4px" }}>
            Привет, {profile?.full_name || user?.email}!
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <Button className="bg-white text-black"
            onClick={() => onNavigate("create-listing")}
            variant={"outline"}
          >
            + Создать объявление
          </Button>
          <Button className="bg-red-500" onClick={handleSignOut} variant={"outline"}>
            Выйти
            <SquareArrowRightExit className="scale-125" />
          </Button>
        </div>
      </div>

      {/* My Active Sessions */}
      {mySessions.length > 0 && (
        <div style={{ marginBottom: "40px" }} className="fade-in">
          <h2
            style={{
              fontSize: "1.5rem",
              color: "#001858",
              marginBottom: "20px",
              fontWeight: 700,
            }}
          >
            🔥 Мои активные сессии
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "16px",
            }}
          >
            {mySessions.map((session) => (
              <div
                key={session.id}
                className="card"
                onClick={() => onNavigate("session", session)}
                style={{ cursor: "pointer" }}
              >
                <h3
                  style={{
                    color: "#001858",
                    marginBottom: "8px",
                    fontSize: "1.1rem",
                  }}
                >
                  {session.study_listings?.title}
                </h3>
                <p
                  style={{
                    color: "#666",
                    fontSize: "14px",
                    marginBottom: "12px",
                  }}
                >
                  {session.study_listings?.subject}
                </p>
                <div
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    background: "#f582ae",
                    color: "white",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  Активна
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Listings */}
      <h2
        style={{
          fontSize: "1.5rem",
          color: "#001858",
          marginBottom: "20px",
          fontWeight: 700,
        }}
      >
        📚 Все объявления
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "20px",
        }}
      >
        {listings.map((listing) => (
          <div
            key={listing.id}
            className="card slide-in"
            onClick={() => onNavigate("listing-detail", listing)}
            style={{ cursor: "pointer" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                marginBottom: "12px",
              }}
            >
              <h3 style={{ color: "#001858", margin: 0, fontSize: "1.2rem" }}>
                {listing.title}
              </h3>
              <span
                style={{
                  padding: "4px 10px",
                  background: "#e8d5c4",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#001858",
                  whiteSpace: "nowrap",
                }}
              >
                {listing.level}
              </span>
            </div>
            <p
              style={{
                color: "#f582ae",
                fontWeight: 600,
                fontSize: "14px",
                marginBottom: "12px",
              }}
            >
              {listing.subject}
            </p>
            <p
              style={{
                color: "#666",
                fontSize: "14px",
                lineHeight: "1.5",
                marginBottom: "12px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {listing.description}
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                color: "#999",
              }}
            >
              <span>👤</span>
              <span>{listing.profiles?.full_name}</span>
            </div>
          </div>
        ))}
      </div>

      {listings.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#999",
          }}
        >
          <p style={{ fontSize: "18px" }}>
            Пока нет объявлений. Создайте первое!
          </p>
        </div>
      )}
    </div>
  );
}

// Страница создания объявления
function CreateListingPage({
  user,
  onNavigate,
}: {
  user: User | null;
  onNavigate: (page: Page) => void;
}) {
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    description: "",
    level: "beginner",
    schedule: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase
      .from("study_listings")
      .insert([{ ...formData, user_id: user.id }]);

    if (!error) {
      onNavigate("home");
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px" }}>
      <button
        className="btn-secondary"
        onClick={() => onNavigate("home")}
        style={{ marginBottom: "24px" }}
      >
        ← Назад
      </button>

      <div className="card fade-in">
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "2rem",
            color: "#001858",
            marginBottom: "8px",
          }}
        >
          Создать объявление
        </h1>
        <p style={{ color: "#666", marginBottom: "32px" }}>
          Расскажите, по какому предмету вы ищете напарника для учебы
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "20px" }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 600,
                color: "#001858",
              }}
            >
              Название
            </label>
            <input
              type="text"
              placeholder="Например: Ищу напарника для изучения React"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 600,
                color: "#001858",
              }}
            >
              Предмет
            </label>
            <input
              type="text"
              placeholder="React, Python, Математика и т.д."
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 600,
                color: "#001858",
              }}
            >
              Уровень
            </label>
            <select
              value={formData.level}
              onChange={(e) =>
                setFormData({ ...formData, level: e.target.value })
              }
            >
              <option value="beginner">Начинающий</option>
              <option value="intermediate">Средний</option>
              <option value="advanced">Продвинутый</option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 600,
                color: "#001858",
              }}
            >
              Описание
            </label>
            <textarea
              rows={5}
              placeholder="Опишите, что вы хотите изучать, какие цели преследуете..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 600,
                color: "#001858",
              }}
            >
              Расписание
            </label>
            <input
              type="text"
              placeholder="Например: Вечера по будням, выходные"
              value={formData.schedule}
              onChange={(e) =>
                setFormData({ ...formData, schedule: e.target.value })
              }
              required
            />
          </div>

          <button type="submit" className="btn-primary">
            Опубликовать объявление
          </button>
        </form>
      </div>
    </div>
  );
}

// Страница деталей объявления
function ListingDetailPage({
  listing,
  user,
  onNavigate,
}: {
  listing: StudyListing | null;
  user: User | null;
  onNavigate: (page: Page, data?: any) => void;
}) {
  const [loading, setLoading] = useState(false);

  if (!listing) return null;

  const isMyListing = listing.user_id === user?.id;

  const handleProposePairing = async () => {
    if (!user || isMyListing) return;

    setLoading(true);

    // Проверка существующей сессии
    const { data: existingSession } = await supabase
      .from("study_sessions")
      .select("*, study_listings(*)")
      .eq("listing_id", listing.id)
      .or(`creator_id.eq.${user.id},partner_id.eq.${user.id}`)
      .single();

    if (existingSession) {
      onNavigate("session", existingSession);
      return;
    }

    // Создание новой сессии
    const { data: newSession, error } = await supabase
      .from("study_sessions")
      .insert([
        {
          listing_id: listing.id,
          creator_id: listing.user_id,
          partner_id: user.id,
          status: "active",
        },
      ])
      .select("*, study_listings(*)")
      .single();

    setLoading(false);

    if (!error && newSession) {
      onNavigate("session", newSession);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "40px 20px" }}>
      <button
        className="btn-secondary"
        onClick={() => onNavigate("home")}
        style={{ marginBottom: "24px" }}
      >
        ← К объявлениям
      </button>

      <div className="card fade-in">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "start",
            marginBottom: "20px",
          }}
        >
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "2rem",
              color: "#001858",
              margin: 0,
            }}
          >
            {listing.title}
          </h1>
          <span
            style={{
              padding: "6px 14px",
              background: "#e8d5c4",
              borderRadius: "16px",
              fontSize: "14px",
              fontWeight: 600,
              color: "#001858",
            }}
          >
            {listing.level}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "24px",
            paddingBottom: "24px",
            borderBottom: "2px solid #fef6e4",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #f582ae 0%, #e8505b 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "20px",
              fontWeight: 700,
            }}
          >
            {listing.profiles?.full_name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: "#001858" }}>
              {listing.profiles?.full_name}
            </div>
            <div style={{ fontSize: "14px", color: "#999" }}>
              {new Date(listing.created_at).toLocaleDateString("ru-RU")}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ color: "#001858", marginBottom: "8px" }}>Предмет</h3>
          <p style={{ color: "#f582ae", fontWeight: 600, fontSize: "18px" }}>
            {listing.subject}
          </p>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <h3 style={{ color: "#001858", marginBottom: "8px" }}>Описание</h3>
          <p style={{ color: "#666", lineHeight: "1.6" }}>
            {listing.description}
          </p>
        </div>

        <div style={{ marginBottom: "32px" }}>
          <h3 style={{ color: "#001858", marginBottom: "8px" }}>Расписание</h3>
          <p style={{ color: "#666" }}>{listing.schedule}</p>
        </div>

        {!isMyListing && (
          <button
            className="btn-primary"
            onClick={handleProposePairing}
            disabled={loading}
            style={{ width: "100%", fontSize: "16px", padding: "16px" }}
          >
            {loading
              ? "Создание сессии..."
              : "🤝 Предложить совместное обучение"}
          </button>
        )}

        {isMyListing && (
          <div
            style={{
              padding: "16px",
              background: "#fef6e4",
              borderRadius: "8px",
              textAlign: "center",
              color: "#666",
            }}
          >
            Это ваше объявление
          </div>
        )}
      </div>
    </div>
  );
}

// Страница учебной сессии с чатом
function SessionPage({
  session,
  user,
  onNavigate,
}: {
  session: StudySession | null;
  user: User | null;
  onNavigate: (page: Page) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) return;

    loadMessages();

    // Realtime подписка на новые сообщения
    const channel = supabase
      .channel(`session-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "session_messages",
          filter: `session_id=eq.${session.id}`,
        },
        async (payload) => {
          // Загрузка профиля отправителя
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", payload.new.user_id)
            .single();

          setMessages((current) => [
            ...current,
            { ...payload.new, profiles: profile } as Message,
          ]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    if (!session) return;

    const { data } = await supabase
      .from("session_messages")
      .select("*, profiles(*)")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });

    if (data) setMessages(data);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !session) return;

    const { error } = await supabase.from("session_messages").insert([
      {
        session_id: session.id,
        user_id: user.id,
        content: newMessage.trim(),
      },
    ]);

    if (!error) {
      setNewMessage("");
    }
  };

  if (!session) return null;

  return (
    <div
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "20px",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          paddingTop: "20px",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "1.8rem",
              color: "#001858",
              margin: 0,
            }}
          >
            {session.study_listings?.title}
          </h1>
          <p style={{ color: "#f582ae", fontWeight: 600, marginTop: "4px" }}>
            {session.study_listings?.subject}
          </p>
        </div>
        <button className="btn-secondary" onClick={() => onNavigate("home")}>
          ← На главную
        </button>
      </div>

      <div
        className="card"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
        }}
      >
        {/* Messages area */}
        <div
          className="scrollbar"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: "#999",
              }}
            >
              <p>Начните общение с вашим напарником! 💬</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMyMessage = msg.user_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className="slide-in"
                  style={{
                    marginBottom: "16px",
                    display: "flex",
                    justifyContent: isMyMessage ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "70%",
                      padding: "12px 16px",
                      borderRadius: "16px",
                      background: isMyMessage
                        ? "linear-gradient(135deg, #f582ae 0%, #e8505b 100%)"
                        : "#fef6e4",
                      color: isMyMessage ? "white" : "#001858",
                    }}
                  >
                    {!isMyMessage && (
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          marginBottom: "4px",
                          opacity: 0.8,
                        }}
                      >
                        {msg.profiles?.full_name}
                      </div>
                    )}
                    <div style={{ lineHeight: "1.4" }}>{msg.content}</div>
                    <div
                      style={{
                        fontSize: "11px",
                        marginTop: "4px",
                        opacity: 0.7,
                        textAlign: "right",
                      }}
                    >
                      {new Date(msg.created_at).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <form
          onSubmit={sendMessage}
          style={{
            padding: "20px",
            borderTop: "2px solid #fef6e4",
            display: "flex",
            gap: "12px",
          }}
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Напишите сообщение..."
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn-primary">
            Отправить
          </button>
        </form>
      </div>
    </div>
  );
}
