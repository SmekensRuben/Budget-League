import { Navigate, useLocation } from "react-router-dom";
import { useHotelContext } from "../../contexts/HotelContext";

export default function ProtectedRoute({ children }) {
  const { hotelUid, loading } = useHotelContext();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        ⏳ Bezig met controleren...
      </div>
    );
  }

  if (!hotelUid) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname || "/settings" }}
      />
    );
  }

  return children;
}
