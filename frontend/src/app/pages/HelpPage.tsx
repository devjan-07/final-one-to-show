import { useState } from "react";
import { Link } from "react-router";
import { BookOpen, CreditCard, Map, ChevronDown, Search, HelpCircle, Mail, MessageSquare } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

const categories = [
  {
    id: "getting-started",
    icon: BookOpen,
    label: "Getting Started",
    faqs: [
      { q: "How do I create a Voyara account?", a: "Click the profile icon in the top right corner of the page and select 'Sign up'. Fill in your name, email and a secure password, then enter the verification code sent to your email." },
      { q: "Is Voyara free to use?", a: "Yes! Browsing tours, destinations, and experiences is completely free. You only pay when you book a tour or experience. There are no hidden subscription fees." },
      { q: "How do I find tours in my destination?", a: "Use the search bar on the homepage to type a destination. You can also browse by category using the filter bar, or explore the Popular Destinations section to discover top cities." },
      { q: "Can I use Voyara on mobile?", a: "Absolutely. Voyara is fully responsive and works great on smartphones and tablets through any modern browser. A dedicated mobile app is coming soon." },
      { q: "How do I save tours to a wishlist?", a: "Click the heart icon on any tour card or destination to save it to your wishlist. You must be signed in to save items. Access your wishlist from your profile menu." },
      { q: "Can I change my account details after signing up?", a: "Yes. Log in and navigate to your profile settings to update your name, email, password, and notification preferences at any time." },
    ],
  },
  {
    id: "bookings",
    icon: CreditCard,
    label: "Bookings & Payments",
    faqs: [
      { q: "What payment methods are accepted?", a: "Voyara accepts card payments after a booking is confirmed. Available payment options are shown during checkout." },
      { q: "Can I get a refund if I cancel?", a: "Cancellation policies vary by tour operator. Most tours offer full refunds if cancelled 48+ hours before the start time. Check each tour's specific cancellation policy before booking." },
      { q: "How far in advance should I book?", a: "Popular tours, especially in peak season (June–August and December), often sell out weeks in advance. We recommend booking at least 2–3 weeks ahead for popular destinations." },
      { q: "Is my payment information secure?", a: "Voyara only keeps limited payment reference details for your booking. Full card numbers and CVV codes are not stored." },
      { q: "What happens if a tour gets cancelled by the operator?", a: "If a tour is cancelled by the operator, you will receive a full refund within 5–7 business days. You will also receive an email with alternative tour suggestions for your dates." },
      { q: "Can I modify my booking after it is confirmed?", a: "Date changes are permitted up to 24 hours before the tour start, subject to availability. Log in, go to My Bookings, and select 'Modify' next to the relevant booking." },
    ],
  },
  {
    id: "tours",
    icon: Map,
    label: "Tours & Guides",
    faqs: [
      { q: "How are tour guides verified?", a: "Every guide on Voyara undergoes a background check, identity verification, and a review of their professional certifications. Only guides with a minimum 4.5-star rating from at least 10 reviews are featured." },
      { q: "What is included in a tour package?", a: "Each tour listing clearly states what is included — typically guide fees, entrance tickets, and transportation between stops. Meals and personal expenses are generally not included unless specified." },
      { q: "Can I request a private tour?", a: "Yes. Many tours offer a 'Private Tour' option on their booking page. Alternatively, use the 'List your tour' form or contact the guide directly through their profile to arrange a custom private experience." },
      { q: "What if I have dietary restrictions or accessibility needs?", a: "You can add special requirements in the notes section when booking. Guides are notified immediately and will do their best to accommodate. For complex needs, contact the guide directly before booking." },
      { q: "Are tours suitable for children?", a: "Most tours are family-friendly, but the listing will clearly mark the minimum recommended age. Adventure or hiking tours may have age and fitness restrictions — always check before booking." },
      { q: "What language are tours conducted in?", a: "Each tour listing shows available languages. Many popular tours are offered in English, Spanish, French, and Mandarin. Use the language filter when searching to find tours in your preferred language." },
    ],
  },
];

export default function HelpPage() {
  const [activeCategory, setActiveCategory] = useState("getting-started");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const toggleItem = (key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const activeCat = categories.find((c) => c.id === activeCategory)!;
  const filteredFaqs = search.trim()
    ? categories.flatMap((c) => c.faqs.filter((f) => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase())).map((f) => ({ ...f, catId: c.id })))
    : activeCat.faqs.map((f) => ({ ...f, catId: activeCategory }));

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <div className="py-20 px-4 text-center" style={{ background: "linear-gradient(135deg, #FF385C 0%, #E31C5F 50%, #C13584 100%)" }}>
        <p className="text-white/70 text-sm font-medium uppercase tracking-widest mb-3">We are here to help</p>
        <h1 className="text-white mb-4" style={{ fontWeight: 800, fontSize: "clamp(2rem, 5vw, 3rem)" }}>Help Center</h1>
        <p className="text-white/80 mb-8 max-w-md mx-auto">Find answers to common questions about tours, bookings, and your account.</p>
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search your question…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl text-sm text-gray-800 outline-none shadow-xl"
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Category cards */}
        {!search.trim() && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setOpenItems(new Set()); }}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all text-center"
                  style={{
                    borderColor: isActive ? "#FF385C" : "#e5e7eb",
                    background: isActive ? "#fff5f7" : "white",
                  }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: isActive ? "#FF385C" : "#f3f4f6" }}>
                    <Icon className="w-6 h-6" style={{ color: isActive ? "white" : "#6b7280" }} />
                  </div>
                  <p className="font-semibold text-sm text-gray-800">{cat.label}</p>
                  <p className="text-xs text-gray-400">{cat.faqs.length} articles</p>
                </button>
              );
            })}
          </div>
        )}

        {/* FAQ list */}
        <div>
          {search.trim() && (
            <p className="text-sm text-gray-500 mb-6">{filteredFaqs.length} result{filteredFaqs.length !== 1 ? "s" : ""} for "<span className="font-semibold text-gray-800">{search}</span>"</p>
          )}
          {!search.trim() && (
            <h2 className="text-gray-900 mb-6" style={{ fontWeight: 700, fontSize: "1.25rem" }}>{activeCat.label}</h2>
          )}

          {filteredFaqs.length === 0 ? (
            <div className="text-center py-16">
              <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No results found. Try a different search term.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFaqs.map((faq, i) => {
                const key = `${faq.catId}-${i}`;
                const isOpen = openItems.has(key);
                return (
                  <div key={key} className="rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
                    <button
                      onClick={() => toggleItem(key)}
                      className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm font-semibold text-gray-800">{faq.q}</span>
                      <ChevronDown className="w-4 h-4 shrink-0 text-gray-400 transition-transform" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-5" style={{ borderTop: "1px solid #f0f0f0" }}>
                        <p className="text-sm text-gray-600 leading-relaxed pt-4">{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl p-8 text-center" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
          <HelpCircle className="w-10 h-10 mx-auto mb-4" style={{ color: "#FF385C" }} />
          <h3 className="text-gray-900 font-bold text-lg mb-2">Still need help?</h3>
          <p className="text-gray-500 text-sm mb-6">Our support team is available 24/7 and typically responds within a few hours.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)" }}>
              <MessageSquare className="w-4 h-4" /> Contact Support
            </Link>
            <a href="mailto:support@voyara.com" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors">
              <Mail className="w-4 h-4" /> support@voyara.com
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
