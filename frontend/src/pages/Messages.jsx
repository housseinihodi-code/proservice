import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Paperclip, ArrowLeft, Search, MessageSquare } from "lucide-react";
import { messagesAPI, usersAPI, mediaUrl } from "../services/api";
import { useAuthStore } from "../store/authStore";
import Loader from "../components/common/Loader";

function Avatar({ user, size = "md" }) {
  const s = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  return (
    <img
      src={mediaUrl(user?.profile_picture_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent((user?.first_name || "U") + " " + (user?.last_name || ""))}&background=e5e7eb&color=374151&size=40`}
      alt=""
      className={`${s} rounded-full object-cover flex-shrink-0`}
    />
  );
}

export default function Messages() {
  const { userId: paramUserId } = useParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeUserId, setActiveUserId] = useState(paramUserId || null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef(null);

  const { data: conversations, isLoading: convsLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => messagesAPI.getConversations().then((r) => r.data),
    refetchInterval: 10000,
  });

  const { data: msgs, isLoading: msgsLoading } = useQuery({
    queryKey: ["messages", activeUserId],
    queryFn: () => messagesAPI.getConversation(activeUserId, { page: 1, size: 100 }).then((r) => r.data),
    enabled: !!activeUserId,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: (content) => messagesAPI.send({ receiver_id: activeUserId, content }),
    onSuccess: () => {
      queryClient.invalidateQueries(["messages", activeUserId]);
      queryClient.invalidateQueries(["conversations"]);
      setMessage("");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  useEffect(() => {
    if (paramUserId) setActiveUserId(paramUserId);
  }, [paramUserId]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim() || !activeUserId) return;
    sendMutation.mutate(message.trim());
  };

  const knownConv = conversations?.find((c) => String(c.user?.id) === String(activeUserId));
  // Nouvelle conversation (pas encore de message) : on charge l'interlocuteur pour afficher son nom
  const { data: otherUser } = useQuery({
    queryKey: ["user", activeUserId],
    queryFn: () => usersAPI.getUser(activeUserId).then((r) => r.data),
    enabled: !!activeUserId && !!conversations && !knownConv,
  });
  const activeConv = knownConv || (otherUser ? { user: otherUser } : null);
  const filteredConvs = conversations?.filter((c) =>
    !searchQuery || `${c.user?.first_name} ${c.user?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const sortedMessages = msgs?.items ? [...msgs.items].reverse() : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 h-[calc(100dvh-8rem)]">
      <div className="flex gap-4 h-full">
        {/* Conversation list */}
        <div className={`w-full md:w-80 flex-shrink-0 card flex flex-col ${activeUserId ? "hidden md:flex" : "flex"}`}>
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input className="input-field pl-9 text-sm" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {convsLoading ? <div className="p-4 text-center"><Loader /></div> : filteredConvs?.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-sm">Aucune conversation</p>
              </div>
            ) : filteredConvs?.map((conv) => (
              <button
                key={conv.user?.id}
                onClick={() => { setActiveUserId(conv.user?.id); navigate(`/messages/${conv.user?.id}`); }}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center gap-3 ${String(activeUserId) === String(conv.user?.id) ? "bg-primary-50 border-r-2 border-primary-600" : ""}`}
              >
                <Avatar user={conv.user} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 text-sm truncate">{conv.user?.first_name} {conv.user?.last_name}</span>
                    {conv.unread_count > 0 && (
                      <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">{conv.unread_count}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{conv.last_message?.content}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat window */}
        {activeUserId ? (
          <div className="flex-1 card flex flex-col min-w-0">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <button onClick={() => { setActiveUserId(null); navigate("/messages"); }} className="md:hidden text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-5 h-5" />
              </button>
              {activeConv?.user && <Avatar user={activeConv.user} />}
              <div>
                <p className="font-semibold text-gray-900">{activeConv?.user?.first_name} {activeConv?.user?.last_name}</p>
                <p className="text-xs text-gray-500">{activeConv?.user?.role === "PROFESSIONAL" ? "Professionnel" : "Client"}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgsLoading ? <Loader /> : sortedMessages.map((msg) => {
                const isMe = String(msg.sender_id) === String(user?.id);
                return (
                  <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                    {!isMe && <Avatar user={msg.sender} size="sm" />}
                    <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-primary-600 text-white rounded-br-sm" : "bg-gray-100 text-gray-900 rounded-bl-sm"}`}>
                        {msg.file_url ? (
                          <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="underline flex items-center gap-1">
                            <Paperclip className="w-3 h-3" /> {msg.file_name || "Fichier"}
                          </a>
                        ) : msg.content}
                      </div>
                      <span className="text-xs text-gray-400 px-1">
                        {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-gray-100 flex items-center gap-2">
              <input
                className="input-field flex-1 min-w-0"
                placeholder="Écrivez votre message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend(e)}
              />
              <button type="submit" disabled={!message.trim() || sendMutation.isPending} className="btn-primary p-2.5 flex-shrink-0 disabled:opacity-50">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 card hidden md:flex items-center justify-center">
            <div className="text-center text-gray-400">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" strokeWidth={1.5} />
              <p className="font-medium">Sélectionnez une conversation</p>
              <p className="text-sm mt-1">ou commencez une nouvelle discussion</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
