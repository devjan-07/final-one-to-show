import { Globe } from "lucide-react";
import logoImg from "../../imports/c8f8ad87-0b32-4268-ba96-7d4a61b80241.png";

const footerLinks = {
  Support: ["Help Center", "Safety information", "Cancellation options", "Report a concern"],
  Destinations: ["Sigiriya", "Ella", "Mirissa", "Kandy", "Galle", "Nuwara Eliya"],
  "For Guides": ["Become a guide", "Guide resources", "Community forum", "Responsible hosting"],
};

export function Footer() {
  return (
    <footer style={{ borderTop: "1px solid #e5e7eb", background: "#fff" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-10">
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-gray-900 mb-4" style={{ fontWeight: 700, fontSize: "0.875rem" }}>{section}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-gray-500 hover:text-gray-800 hover:underline transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8" style={{ borderTop: "1px solid #e5e7eb" }}>
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Voyara" className="h-10 w-auto object-contain" />
            <span className="text-sm text-gray-400">© 2026 All rights reserved.</span>
          </div>

          <div className="flex items-center gap-5">
            {["Privacy", "Terms", "Sitemap", "Cookie settings"].map((item) => (
              <a key={item} href="#" className="text-sm text-gray-500 hover:text-gray-800 hover:underline transition-colors">
                {item}
              </a>
            ))}
            <button className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
              <Globe className="w-4 h-4" />
              EN
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
