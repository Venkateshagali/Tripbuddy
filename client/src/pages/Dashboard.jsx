import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [trips, setTrips] = useState([]);
  const [tripName, setTripName] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const headers = useMemo(() => ({ authorization: token }), [token]);

  const fetchTrips = async () => {
    const res = await axios.get("http://localhost:5000/api/trips/my", { headers });
    setTrips(res.data);
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const createTrip = async () => {
    if (!tripName) return alert("Trip name is required");
    setLoading(true);
    try {
      await axios.post(
        "http://localhost:5000/api/trips/create",
        { name: tripName, destination, startDate, endDate, currency: "INR" },
        { headers }
      );
      setTripName("");
      setDestination("");
      setStartDate("");
      setEndDate("");
      await fetchTrips();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to create trip");
    } finally {
      setLoading(false);
    }
  };

  const joinTrip = async () => {
    if (!inviteCode) return alert("Enter invite code");
    setLoading(true);
    try {
      await axios.post("http://localhost:5000/api/trips/join", { inviteCode }, { headers });
      setInviteCode("");
      await fetchTrips();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to join trip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed p-8"
      style={{
        backgroundImage:
          "linear-gradient(rgba(250,245,235,0.92), rgba(245,235,220,0.92)), url('/goa-bg.jpg')"
      }}
    >
      <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
        <h2 className="text-4xl font-bold text-amber-900">My Trips</h2>
        <button onClick={logout} className="bg-rose-600 text-white px-5 py-2 rounded-xl hover:bg-rose-700">
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#fff8ef]/85 backdrop-blur p-6 rounded-2xl shadow-lg border border-amber-100">
          <h3 className="text-xl font-semibold mb-4 text-amber-900">Create New Trip</h3>
          <input className="input" placeholder="Trip Name" value={tripName} onChange={(e) => setTripName(e.target.value)} />
          <input className="input mt-2" placeholder="Destination" value={destination} onChange={(e) => setDestination(e.target.value)} />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button onClick={createTrip} disabled={loading} className="btn-primary mt-4 w-full">
            Create Trip
          </button>
        </div>

        <div className="bg-[#fff8ef]/85 backdrop-blur p-6 rounded-2xl shadow-lg border border-amber-100">
          <h3 className="text-xl font-semibold mb-4 text-amber-900">Join Trip via Invite</h3>
          <input className="input" placeholder="Invite Code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
          <button onClick={joinTrip} disabled={loading} className="btn-primary mt-4 w-full">
            Join Trip
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {trips.map((trip) => (
          <div key={trip.id} className="bg-[#fffefb] p-6 rounded-2xl shadow-lg border border-amber-100 hover:shadow-xl transition">
            <h3 className="text-2xl font-semibold mb-2 text-amber-950">{trip.name}</h3>
            <p className="text-gray-600 mb-1">{trip.destination}</p>
            <p className="text-sm text-gray-600 mb-1">
              {trip.start_date?.slice(0, 10)} to {trip.end_date?.slice(0, 10)}
            </p>
            <p className="text-sm text-amber-800 mb-1">Members: {trip.member_count}</p>
            <p className="text-sm text-amber-800 mb-4">Shared Spend: INR {trip.total_shared_expense}</p>
            <button onClick={() => navigate(`/trip/${trip.id}`)} className="btn-primary">
              Open Trip
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
