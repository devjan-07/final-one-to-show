import { Link } from "react-router";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: "#fff0f3" }}>
          <ShieldAlert className="w-8 h-8" style={{ color: "#FF385C" }} />
        </div>
        <h1 className="text-gray-900 mb-2" style={{ fontWeight: 800, fontSize: "1.75rem" }}>Access denied</h1>
        <p className="text-gray-500 text-sm mb-6">You do not have permission to view this area.</p>
        <Link to="/" className="inline-flex px-5 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)" }}>
          Back to Voyara
        </Link>
      </div>
    </div>
  );
}
