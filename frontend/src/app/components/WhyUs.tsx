import { ShieldCheck, Headphones, Award, CreditCard } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    color: "#FF385C",
    title: "Verified Guides",
    desc: "Every guide is background-checked, licensed, and rated by real travelers.",
  },
  {
    icon: Award,
    color: "#003580",
    title: "Best Price Guarantee",
    desc: "Find a lower price? We'll match it — no questions asked.",
  },
  {
    icon: Headphones,
    color: "#00AA6C",
    title: "24/7 Support",
    desc: "Our travel experts are available around the clock to assist you anywhere.",
  },
  {
    icon: CreditCard,
    color: "#FF8C00",
    title: "Free Cancellation",
    desc: "Plans change. Cancel up to 24 hours before your tour for a full refund.",
  },
];

export function WhyUs() {
  return (
    <section className="py-16" style={{ background: "#f9fafb" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest mb-1" style={{ color: "#FF385C" }}>Why Voyara</p>
          <h2 className="text-gray-900" style={{ fontWeight: 800, fontSize: "1.75rem" }}>Travel with confidence</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="bg-white rounded-2xl p-6 text-center hover:shadow-md transition-shadow" style={{ border: "1px solid #e5e7eb" }}>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: `${f.color}15` }}
                >
                  <Icon className="w-7 h-7" style={{ color: f.color }} />
                </div>
                <h4 className="text-gray-900 mb-2" style={{ fontWeight: 700 }}>{f.title}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
