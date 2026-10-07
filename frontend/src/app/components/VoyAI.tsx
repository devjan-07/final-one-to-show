import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, Send, Sparkles, MapPin, Compass, RefreshCw } from "lucide-react";
import { aiChatApi } from "../lib/api";

interface Message {
  role: "user" | "ai";
  text: string;
  time: string;
}

const DEFAULT_SUGGESTIONS = ["Best places for 3 days?", "How do I book a tour?", "Cancellation policy?"];
const suggestionIcons = [MapPin, Compass, Sparkles];

const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const INITIAL: Message[] = [
  { role: "ai", text: "Hi! I'm voyAI 👋 Your personal Voyara travel assistant. Ask me anything about destinations, tours, or bookings!", time: now() },
];

export function VoyAI() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250);
  }, [open]);

  useEffect(() => {
    aiChatApi.welcome()
      .then(({ reply }) => setMessages([{ role: "ai", text: reply, time: now() }]))
      .catch((error) => console.error("Failed to load AI welcome message", error));
    aiChatApi.suggestions()
      .then((items) => setSuggestions(items.length ? items : DEFAULT_SUGGESTIONS))
      .catch((error) => console.error("Failed to load AI suggestions", error));
  }, []);

  const send = async (text: string) => {
    if (!text.trim() || typing) return;
    const userMsg = text.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg, time: now() }]);
    setTyping(true);
    try {
      const { reply } = await aiChatApi.chat(userMsg);
      setMessages((prev) => [...prev, { role: "ai", text: reply, time: now() }]);
    } catch (error) {
      console.error("Failed to send AI chat message", error);
      setMessages((prev) => [...prev, { role: "ai", text: "I couldn't reach voyAI right now. Please try again in a moment.", time: now() }]);
    } finally {
      setTyping(false);
    }
  };

  const reset = () => setMessages(INITIAL);

  return (
    <>
      {/* Floating launcher */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 pl-4 pr-5 py-3.5 rounded-full text-white shadow-xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #003580, #0057B8)" }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        aria-label="Open voyAI assistant"
      >
        {/* soft shine sweep */}
        <motion.span
          className="absolute inset-0 -skew-x-12"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)" }}
          animate={{ x: ["-120%", "220%"] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 2.5 }}
        />
        <span className="relative flex items-center justify-center w-7 h-7 rounded-full" style={{ background: "rgba(255,255,255,0.16)" }}>
          <AnimatePresence mode="wait" initial={false}>
            {open ? (
              <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <X className="w-4 h-4" />
              </motion.span>
            ) : (
              <motion.span key="s" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                <Sparkles className="w-4 h-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <span className="relative font-semibold text-sm tracking-tight">voyAI</span>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed bottom-24 right-6 z-50 flex flex-col rounded-[26px] overflow-hidden origin-bottom-right"
            style={{
              width: 380,
              height: 560,
              maxHeight: "calc(100vh - 8rem)",
              boxShadow: "0 24px 60px -12px rgba(0,53,128,0.35), 0 8px 20px -8px rgba(0,0,0,0.25)",
              border: "1px solid rgba(255,255,255,0.6)",
            }}
          >
            {/* Header */}
            <div className="relative px-4 pt-4 pb-4 text-white" style={{ background: "linear-gradient(135deg, #002a66, #0057B8)" }}>
              <div
                className="absolute inset-0 opacity-40"
                style={{ background: "radial-gradient(120% 90% at 100% 0%, rgba(255,56,92,0.45), transparent 60%)" }}
              />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.16)", backdropFilter: "blur(4px)" }}>
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0057B8]" />
                  </div>
                  <div>
                    <p className="font-bold text-[15px] leading-none tracking-tight">voyAI</p>
                    <p className="text-white/70 text-xs mt-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Online · replies instantly
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={reset} title="New chat" className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button onClick={() => setOpen(false)} title="Close" className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: "linear-gradient(#f7f9fc, #eef2f8)" }}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-end gap-2 max-w-[82%]">
                    {m.role === "ai" && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #003580, #0057B8)" }}>
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div
                      className="whitespace-pre-line px-3.5 py-2.5 text-sm leading-relaxed shadow-sm"
                      style={
                        m.role === "user"
                          ? { background: "linear-gradient(135deg, #FF385C, #E31C5F)", color: "white", borderRadius: "18px 18px 4px 18px" }
                          : { background: "white", color: "#1f2937", borderRadius: "18px 18px 18px 4px", border: "1px solid #eef0f4" }
                      }
                    >
                      {m.text}
                    </div>
                  </div>
                  <span className={`text-[10px] text-gray-400 mt-1 ${m.role === "user" ? "mr-1" : "ml-9"}`}>{m.time}</span>
                </motion.div>
              ))}

              {typing && (
                <div className="flex items-end gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #003580, #0057B8)" }}>
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="px-4 py-3 bg-white flex gap-1 items-center shadow-sm" style={{ border: "1px solid #eef0f4", borderRadius: "18px 18px 18px 4px" }}>
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-gray-400"
                        animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggestions */}
            {messages.length === 1 && (
              <div className="px-4 pt-3 pb-1 flex flex-col gap-2" style={{ background: "linear-gradient(#eef2f8, #eef2f8)" }}>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Try asking</p>
                <div className="flex flex-col gap-1.5">
                  {suggestions.map((label, index) => {
                    const Icon = suggestionIcons[index % suggestionIcons.length];
                    return (
                    <button
                      key={label}
                      onClick={() => send(label)}
                      className="group flex items-center gap-2.5 text-left text-sm px-3 py-2.5 rounded-xl bg-white hover:bg-[#003580] hover:text-white transition-colors shadow-sm"
                      style={{ border: "1px solid #e6eaf1" }}
                    >
                      <Icon className="w-4 h-4 text-[#0057B8] group-hover:text-white transition-colors" />
                      <span className="font-medium text-gray-700 group-hover:text-white transition-colors">{label}</span>
                    </button>
                  )})}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-2 px-3 py-3 bg-white" style={{ borderTop: "1px solid #eef0f4" }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder="Ask voyAI anything…"
                className="flex-1 text-sm px-4 py-2.5 rounded-full outline-none bg-gray-50 text-gray-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-[#0057B8]/25 transition-all"
                style={{ border: "1px solid #e5e7eb" }}
              />
              <motion.button
                onClick={() => send(input)}
                disabled={!input.trim() || typing}
                whileTap={{ scale: 0.9 }}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity disabled:opacity-40 shadow-md shrink-0"
                style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)" }}
                aria-label="Send message"
              >
                <Send className="w-4 h-4 text-white" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
