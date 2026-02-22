import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";

const TABS = ["Itinerary & Map", "Expenses", "Members", "Settlements", "Plan"];

export default function TripDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const authHeader = useMemo(() => ({ headers: { authorization: token } }), [token]);

  const [trip, setTrip] = useState(null);
  const [me, setMe] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlement, setSettlement] = useState([]);
  const [balances, setBalances] = useState([]);
  const [payments, setPayments] = useState([]);
  const [itinerary, setItinerary] = useState([]);
  const [trains, setTrains] = useState([]);
  const [vehicle, setVehicle] = useState(null);
  const [booking, setBooking] = useState(null);
  const [summary, setSummary] = useState({ total_shared: 0, total_personal: 0 });
  const [membership, setMembership] = useState(null);

  const [activeTab, setActiveTab] = useState("Itinerary & Map");
  const [dark, setDark] = useState(false);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [payerUserId, setPayerUserId] = useState("");
  const [includePayerInSplit, setIncludePayerInSplit] = useState(true);

  const [selectedMember, setSelectedMember] = useState(null);
  const [memberDetails, setMemberDetails] = useState(null);
  const [loadingMember, setLoadingMember] = useState(false);

  const [myUpiId, setMyUpiId] = useState("");
  const [savingUpi, setSavingUpi] = useState(false);
  const [inviteData, setInviteData] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const memberById = useMemo(() => {
    const map = new Map();
    members.forEach((m) => map.set(Number(m.id), m));
    return map;
  }, [members]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([
      fetchMe(),
      fetchTrip(),
      fetchExpenses(),
      fetchSettlement(),
      fetchPayments(),
      fetchItinerary(),
      fetchTrains(),
      fetchVehicle(),
      fetchBooking(),
      fetchSummary()
    ]);
  };

  const fetchMe = async () => {
    const res = await api.get("/api/auth/me", authHeader);
    setMe(res.data);
    setMyUpiId(res.data?.upi_id || "");
  };

  const fetchTrip = async () => {
    const res = await api.get(`/api/trips/${id}`, authHeader);
    setTrip(res.data.trip);
    setMembers(res.data.members);
    setMembership(res.data.membership || null);
    setSelectedMembers(res.data.members.map((m) => m.id));
    if (!payerUserId && res.data.members.length) {
      const mine = res.data.members.find((m) => Number(m.id) === Number(me?.id || -1));
      setPayerUserId(String(mine?.id || res.data.members[0].id));
    }
  };

  const fetchExpenses = async () => {
    const res = await api.get(`/api/expenses/trip/${id}`, authHeader);
    setExpenses(res.data);
  };

  const fetchSettlement = async () => {
    const res = await api.get(`/api/expenses/settlement/${id}`, authHeader);
    setSettlement(res.data.transactions || []);
    setBalances(res.data.balances || []);
  };

  const fetchPayments = async () => {
    try {
      const res = await api.get(`/api/payments/${id}`, authHeader);
      setPayments(res.data || []);
    } catch (_err) {
      setPayments([]);
    }
  };

  const fetchItinerary = async () => {
    const res = await api.get(`/api/itinerary/${id}`, authHeader);
    setItinerary(res.data);
  };

  const fetchTrains = async () => {
    const res = await api.get(`/api/train/${id}`, authHeader);
    setTrains(res.data);
  };

  const fetchVehicle = async () => {
    const res = await api.get(`/api/vehicle/${id}`, authHeader);
    setVehicle(Array.isArray(res.data) ? res.data[0] : res.data);
  };

  const fetchBooking = async () => {
    const res = await api.get(`/api/booking/${id}`, authHeader);
    setBooking(Array.isArray(res.data) ? res.data[0] : res.data);
  };

  const fetchSummary = async () => {
    const res = await api.get(`/api/expenses/summary/${id}`, authHeader);
    setSummary(res.data);
  };

  const openMemberDetails = async (member) => {
    setSelectedMember(member);
    setLoadingMember(true);
    try {
      const res = await api.get(`/api/expenses/member/${id}/${member.id}`, authHeader);
      setMemberDetails(res.data);
    } finally {
      setLoadingMember(false);
    }
  };

  const saveMyUpi = async () => {
    setSavingUpi(true);
    try {
      await api.put("/api/auth/me/upi", { upiId: myUpiId || null }, authHeader);
      await fetchMe();
      await fetchTrip();
    } finally {
      setSavingUpi(false);
    }
  };

  const handleGenerateInvite = async () => {
    if (!isOwner) return;
    setInviteLoading(true);
    try {
      const res = await api.post(`/api/trips/${id}/invite`, { expiresHours: 168, maxUses: 100 }, authHeader);
      setInviteData(res.data);
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to generate invite");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteData?.inviteCode) return;
    const text = `${inviteData.inviteCode}\n${inviteData.inviteLink || ""}`.trim();
    try {
      await navigator.clipboard.writeText(text);
      alert("Invite copied");
    } catch (_e) {
      alert("Copy failed");
    }
  };

  const handleAddExpense = async () => {
    if (!title || !amount || !payerUserId) return alert("Enter title, amount, and payer");

    const finalSplitUsers = includePayerInSplit
      ? selectedMembers
      : selectedMembers.filter((uid) => Number(uid) !== Number(payerUserId));

    await api.post(
      "/api/expenses/add",
      {
        tripId: Number(id),
        title,
        amount: Number(amount),
        category,
        payerUserId: Number(payerUserId),
        splitType: "equal",
        payerIncluded: includePayerInSplit,
        splitUsers: finalSplitUsers
      },
      authHeader
    );

    setTitle("");
    setAmount("");
    setCategory("Other");
    await loadAllData();
  };

  const handleMarkPaid = async (tx) => {
    await api.post(
      "/api/expenses/payment",
      { tripId: Number(id), toUserId: Number(tx.toUserId), amount: Number(tx.amount), notes: "Paid directly" },
      authHeader
    );
    await loadAllData();
  };

  const handleConfirmReceived = async (paymentId) => {
    await api.post(
      "/api/expenses/payment/confirm",
      { paymentId: Number(paymentId) },
      authHeader
    );
    await loadAllData();
  };

  const handleEditExpense = async (expense) => {
    const nextTitle = prompt("Expense title", expense.title);
    if (!nextTitle) return;
    const nextAmount = prompt("Amount", String(expense.amount));
    if (!nextAmount) return;
    const nextCategory = prompt("Category (Travel/Food/Stay/Activity/Other)", expense.category || "Other");

    await api.put(
      `/api/expenses/${expense.id}`,
      { title: nextTitle, amount: Number(nextAmount), category: nextCategory || expense.category },
      authHeader
    );
    await loadAllData();
  };

  const handleDeleteExpense = async (expense) => {
    if (!confirm(`Delete expense \"${expense.title}\"?`)) return;
    await api.delete(`/api/expenses/${expense.id}`, authHeader);
    await loadAllData();
  };

  if (!trip) return <div className="p-10">Loading...</div>;

  const totalShared = Number(summary?.total_shared || 0);
  const totalPersonal = Number(summary?.total_personal || 0);
  const isOwner = membership?.role === "owner";
  const myPendingToPay = settlement
    .filter((tx) => Number(tx.fromUserId) === Number(me?.id))
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const myReceivable = settlement
    .filter((tx) => Number(tx.toUserId) === Number(me?.id))
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const totalPendingAmount = settlement.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const tripTheme = dark
    ? "bg-slate-950 text-slate-100"
    : "text-slate-900";

  const buildDayMapUrl = (item) => {
    const fallback = item.map_link || "https://maps.google.com/?q=Goa";
    const normalize = (raw) => {
      const t = String(raw || "").trim();
      if (!t) return "";
      if (t.toLowerCase() === "stay") return booking?.property_name || "goSTOPS Goa Vagator PLUS";
      return t;
    };

    const stops = String(item.description || "")
      .split("->")
      .map(normalize)
      .filter(Boolean);

    if (stops.length < 2) return fallback;

    const origin = encodeURIComponent(stops[0]);
    const destination = encodeURIComponent(stops[stops.length - 1]);
    const waypoints = stops.slice(1, -1).map((s) => encodeURIComponent(s)).join("|");
    const base = `https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=${origin}&destination=${destination}`;
    return waypoints ? `${base}&waypoints=${waypoints}` : base;
  };

  const handleAddItinerary = async () => {
    if (!isOwner) return;
    const dayNumber = prompt("Day number", "1");
    if (!dayNumber) return;
    const nextTitle = prompt("Title", "New plan");
    if (!nextTitle) return;
    const nextDescription = prompt("Route (use -> between places)", "goSTOPS Goa Vagator PLUS -> Calangute Beach");
    const nextLocation = prompt("Area", "Goa");
    await api.post(
      `/api/itinerary/${id}`,
      {
        dayNumber: Number(dayNumber),
        title: nextTitle,
        description: nextDescription || "",
        location: nextLocation || "Goa"
      },
      authHeader
    );
    await fetchItinerary();
  };

  const handleEditItinerary = async (item) => {
    if (!isOwner) return;
    const dayNumber = prompt("Day number", String(item.day_number || 1));
    if (!dayNumber) return;
    const nextTitle = prompt("Title", item.title || "");
    if (!nextTitle) return;
    const nextDescription = prompt("Route (use -> between places)", item.description || "");
    const nextLocation = prompt("Area", item.location || "Goa");
    await api.put(
      `/api/itinerary/${id}/${item.id}`,
      {
        dayNumber: Number(dayNumber),
        title: nextTitle,
        description: nextDescription || "",
        location: nextLocation || "Goa"
      },
      authHeader
    );
    await fetchItinerary();
  };

  const handleDeleteItinerary = async (item) => {
    if (!isOwner) return;
    if (!confirm(`Delete Day ${item.day_number}: ${item.title}?`)) return;
    await api.delete(`/api/itinerary/${id}/${item.id}`, authHeader);
    await fetchItinerary();
  };

  const handleEditTrain = async (train) => {
    if (!isOwner) return;
    const direction = prompt("Direction", train.direction || "");
    if (!direction) return;
    const trainNumber = prompt("Train number", train.train_number || "");
    if (!trainNumber) return;
    const departure = prompt("Departure", train.departure || "");
    const arrival = prompt("Arrival", train.arrival || "");
    const travelDate = prompt("Travel date (YYYY-MM-DD)", String(train.travel_date || "").slice(0, 10));
    const costPerPerson = prompt("Cost per person", String(train.cost_per_person || 0));
    await api.put(
      `/api/train/${id}/${train.id}`,
      { direction, trainNumber, departure, arrival, travelDate, costPerPerson: Number(costPerPerson || 0) },
      authHeader
    );
    await fetchTrains();
  };

  const handleEditVehicle = async () => {
    if (!isOwner || !vehicle) return;
    const vehicleName = prompt("Vehicle name", vehicle.vehicle_name || "");
    if (!vehicleName) return;
    const rentAmount = prompt("Rent amount", String(vehicle.rent_amount || 0));
    const pickupCharge = prompt("Pickup charge", String(vehicle.pickup_charge || 0));
    const deposit = prompt("Deposit", String(vehicle.deposit || 0));
    const advancePaid = prompt("Advance paid", String(vehicle.advance_paid || 0));
    const remainingBalance = prompt("Remaining balance", String(vehicle.remaining_balance || 0));
    await api.put(
      `/api/vehicle/${id}/${vehicle.id}`,
      { vehicleName, rentAmount: Number(rentAmount || 0), pickupCharge: Number(pickupCharge || 0), deposit: Number(deposit || 0), advancePaid: Number(advancePaid || 0), remainingBalance: Number(remainingBalance || 0) },
      authHeader
    );
    await fetchVehicle();
  };

  const handleEditBooking = async () => {
    if (!isOwner || !booking) return;
    const propertyName = prompt("Property name", booking.property_name || "");
    if (!propertyName) return;
    const bookingCode = prompt("Booking code", booking.booking_id || "");
    const amountPaid = prompt("Total amount", String(booking.amount_paid || 0));
    const checkinDate = prompt("Check-in (YYYY-MM-DD HH:mm:ss)", String(booking.checkin_date || "").slice(0, 19).replace("T", " "));
    const checkoutDate = prompt("Check-out (YYYY-MM-DD HH:mm:ss)", String(booking.checkout_date || "").slice(0, 19).replace("T", " "));
    const guests = prompt("Guests", String(booking.guests || 1));
    await api.put(
      `/api/booking/${id}/${booking.id}`,
      { propertyName, bookingCode, amountPaid: Number(amountPaid || 0), checkinDate, checkoutDate, guests: Number(guests || 1) },
      authHeader
    );
    await fetchBooking();
  };

  return (
    <div
      className={`min-h-screen transition-colors ${tripTheme} ${dark ? "" : "bg-cover bg-center bg-fixed"}`}
      style={
        dark
          ? undefined
          : {
              backgroundImage:
                "linear-gradient(rgba(250,245,235,0.92), rgba(245,235,220,0.92)), url('/goa-bg.jpg')"
            }
      }
    >
      <div className="mx-auto max-w-6xl p-6 md:p-10">
        <header className="mb-6 rounded-3xl border border-amber-100 bg-[#fff8ef]/85 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
                <h1 className="text-4xl font-black tracking-tight text-[#6b3e26]">{trip.name || trip.title}</h1>
              <p className="text-sm opacity-80">{trip.start_date?.slice(0, 10)} to {trip.end_date?.slice(0, 10)} | {trip.destination}</p>
            </div>
            <div className="flex gap-2">
              {isOwner ? (
                <button
                  onClick={handleGenerateInvite}
                  className="rounded-xl bg-[#b3652a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9a5623]"
                >
                  {inviteLoading ? "Generating..." : "Share Invite"}
                </button>
              ) : null}
              <button onClick={() => setDark((v) => !v)} className="rounded-xl bg-[#e7dcc9] px-4 py-2 text-sm font-semibold text-[#6b3e26] hover:bg-[#dfd1b8]">{dark ? "Light" : "Dark"}</button>
              <button onClick={() => navigate("/dashboard")} className="rounded-xl bg-[#8a5636] px-4 py-2 text-sm font-semibold text-white hover:bg-[#74462b]">Back</button>
            </div>
          </div>
          {isOwner && inviteData ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-white/80 p-3 text-sm">
              <p className="font-semibold text-[#6b3e26]">Invite Code: {inviteData.inviteCode}</p>
              <p className="mt-1 break-all text-xs text-slate-700">{inviteData.inviteLink}</p>
              <div className="mt-2 flex gap-2">
                <button onClick={handleCopyInvite} className="rounded bg-amber-100 px-3 py-1 text-xs font-semibold hover:bg-amber-200">
                  Copy
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Join my TripBuddy trip.\nCode: ${inviteData.inviteCode}\n${inviteData.inviteLink || ""}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded bg-emerald-100 px-3 py-1 text-xs font-semibold hover:bg-emerald-200"
                >
                  Share WhatsApp
                </a>
              </div>
            </div>
          ) : null}
        </header>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard title="Shared Total" value={`INR ${totalShared.toFixed(2)}`} />
          <StatCard title="Personal Total" value={`INR ${totalPersonal.toFixed(2)}`} />
          <StatCard title="Members" value={String(members.length)} />
        </div>

        <nav className="mb-6 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-[#8a5636] text-white shadow"
                  : "bg-[#fff8ef]/90 text-[#6b3e26] hover:bg-[#fffdf8]"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        {activeTab === "Itinerary & Map" && (
          <Panel title="Trip Itinerary + Maps">
            {isOwner ? <button onClick={handleAddItinerary} className="mb-3 rounded bg-[#8a5636] px-3 py-1 text-xs font-semibold text-white hover:bg-[#74462b]">Add Day Plan</button> : null}
            {itinerary.map((item) => (
              <div key={item.id} className="mb-3 border-b pb-3">
                <p className="font-semibold">Day {item.day_number}: {item.title}</p>
                <p className="text-sm">{item.description}</p>
                <a href={buildDayMapUrl(item)} target="_blank" rel="noreferrer" className="text-sm text-[#8a5636] underline">Open Full Route Map</a>
                {isOwner ? (
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => handleEditItinerary(item)} className="rounded bg-amber-100 px-3 py-1 text-xs font-semibold hover:bg-amber-200">Edit</button>
                    <button onClick={() => handleDeleteItinerary(item)} className="rounded bg-red-100 px-3 py-1 text-xs font-semibold hover:bg-red-200">Delete</button>
                  </div>
                ) : null}
              </div>
            ))}
          </Panel>
        )}

        {activeTab === "Expenses" && (
          <section className="space-y-6">
            <Panel title="Add Expense">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                <input placeholder="Title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
                <input placeholder="Amount" type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
                <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option>Travel</option><option>Food</option><option>Stay</option><option>Activity</option><option>Other</option>
                </select>
                <select className="input" value={payerUserId} onChange={(e) => setPayerUserId(e.target.value)}>
                  <option value="">Who paid?</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <label className="mt-3 block text-sm font-semibold">
                <input type="checkbox" checked={includePayerInSplit} onChange={(e) => setIncludePayerInSplit(e.target.checked)} /> Include payer in split
              </label>

              <p className="mt-3 text-sm font-semibold">Include these members in split</p>
              <div className="mt-1 grid grid-cols-2 gap-1 md:grid-cols-4">
                {members.map((m) => (
                  <label key={m.id} className="text-sm">
                    <input type="checkbox" checked={selectedMembers.includes(m.id)} onChange={() =>
                      setSelectedMembers((prev) => prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id])
                    } /> {m.name}
                  </label>
                ))}
              </div>

              <button onClick={handleAddExpense} className="btn-primary mt-4">Add Expense</button>
            </Panel>

            <Panel title="Expense Timeline">
              {expenses.map((expense) => {
                const myMember = members.find((m) => Number(m.id) === Number(me?.id));
                const canEdit = me && (myMember?.role === "owner" || Number(expense.created_by) === Number(me.id));
                return (
                  <div key={expense.id} className="mb-3 rounded-xl border border-slate-200 bg-white p-3">
                    <p className="font-semibold">{expense.title} - INR {Number(expense.amount).toFixed(2)}</p>
                    <p className="text-sm text-gray-600">{expense.category} | Paid by {expense.paidBy} | {String(expense.expense_date).slice(0, 10)}</p>
                    {canEdit ? (
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => handleEditExpense(expense)} className="rounded bg-amber-100 px-3 py-1 text-xs font-semibold hover:bg-amber-200">Edit</button>
                        <button onClick={() => handleDeleteExpense(expense)} className="rounded bg-red-100 px-3 py-1 text-xs font-semibold hover:bg-red-200">Delete</button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </Panel>
          </section>
        )}

        {activeTab === "Members" && (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Panel title="Trip Members">
              <div className="space-y-2">
                {members.map((m) => {
                  const bal = balances.find((b) => b.id === m.id);
                  const pending = Math.max(0, Number(-(bal?.netBalance || 0)));
                  const receivable = Math.max(0, Number(bal?.netBalance || 0));
                  return (
                    <button key={m.id} onClick={() => openMemberDetails(m)} className="w-full rounded-xl border border-[#eadfcf] bg-[#fffefb] p-3 text-left hover:border-[#c99974]">
                      <p className="font-semibold">{m.name}</p>
                      <p className="text-xs text-gray-500">Net: INR {Number(bal?.netBalance || 0).toFixed(2)} | Paid: INR {Number(bal?.totalPaid || 0).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">Pending: INR {pending.toFixed(2)} | Receivable: INR {receivable.toFixed(2)}</p>
                    </button>
                  );
                })}
              </div>
            </Panel>
            <div className="lg:col-span-2">
              <Panel title={selectedMember ? `${selectedMember.name} Details` : "Select a member"}>
                {!selectedMember ? <p className="text-gray-500">Click a member to view exact spending details.</p> : null}
                {loadingMember ? <p>Loading member details...</p> : null}
                {memberDetails && !loadingMember ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <StatMini label="Paid" value={`INR ${Number(memberDetails.totals.paid).toFixed(2)}`} />
                      <StatMini label="Shared Due" value={`INR ${Number(memberDetails.totals.shared).toFixed(2)}`} />
                      <StatMini label="Personal" value={`INR ${Number(memberDetails.totals.personal).toFixed(2)}`} />
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <StatMini
                        label="Pending To Pay"
                        value={`INR ${Math.max(0, Number(-(balances.find((b) => Number(b.id) === Number(selectedMember.id))?.netBalance || 0))).toFixed(2)}`}
                      />
                      <StatMini
                        label="Receivable"
                        value={`INR ${Math.max(0, Number(balances.find((b) => Number(b.id) === Number(selectedMember.id))?.netBalance || 0)).toFixed(2)}`}
                      />
                    </div>
                    <div>
                      <h4 className="mb-2 font-semibold">What they paid</h4>
                      {memberDetails.paidExpenses.map((e) => <p key={e.id} className="text-sm">{e.title} - INR {Number(e.amount).toFixed(2)}</p>)}
                      {memberDetails.paidExpenses.length === 0 ? <p className="text-sm text-gray-500">No direct expenses paid.</p> : null}
                    </div>
                    <div>
                      <h4 className="mb-2 font-semibold">Their splits</h4>
                      {memberDetails.splits.map((s) => <p key={s.id} className="text-sm">{s.title}: INR {Number(s.share_amount).toFixed(2)}</p>)}
                      {memberDetails.splits.length === 0 ? <p className="text-sm text-gray-500">No splits found.</p> : null}
                    </div>
                    <div>
                      <h4 className="mb-2 font-semibold">Payment History (This Member)</h4>
                      {payments
                        .filter((p) => Number(p.from_user_id) === Number(selectedMember.id) || Number(p.to_user_id) === Number(selectedMember.id))
                        .map((p) => (
                          <p key={p.id} className="text-sm">
                            {p.from_name} {"->"} {p.to_name}: INR {Number(p.amount).toFixed(2)} ({p.status})
                          </p>
                        ))}
                    </div>
                  </div>
                ) : null}
              </Panel>
            </div>
          </section>
        )}

        {activeTab === "Settlements" && (
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Panel title="Recommended Settlements">
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <StatMini label="My Pending" value={`INR ${myPendingToPay.toFixed(2)}`} />
                <StatMini label="My Receivable" value={`INR ${myReceivable.toFixed(2)}`} />
                <StatMini label="Total Pending" value={`INR ${Number(totalPendingAmount || 0).toFixed(2)}`} />
              </div>
              {settlement.length === 0 ? <p className="text-sm text-gray-500">No pending settlements.</p> : null}
              {settlement.map((tx, i) => {
                const payee = memberById.get(Number(tx.toUserId));
                const isCurrentUserPayer = Number(me?.id) === Number(tx.fromUserId);
                return (
                  <div key={i} className="mb-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm">
                    <p>{tx.from} pays {tx.to}: INR {Number(tx.amount).toFixed(2)}</p>
                    {payee?.upi_id ? <p className="text-xs text-gray-600">UPI: {payee.upi_id}</p> : <p className="text-xs text-gray-500">No UPI added by payee.</p>}
                    {isCurrentUserPayer ? (
                      <button onClick={() => handleMarkPaid(tx)} className="mt-2 rounded bg-[#efe2d1] px-3 py-1 text-xs font-semibold text-[#6b3e26] hover:bg-[#e4d3be]">Mark Paid Directly</button>
                    ) : null}
                  </div>
                );
              })}
            </Panel>
            <Panel title="My UPI + Payment History">
              <p className="mb-2 text-xs text-gray-500">Owner can click "Approve Received" when member marks payment as paid.</p>
              <div className="mb-4 flex gap-2">
                <input className="input" placeholder="your-upi@bank (optional)" value={myUpiId} onChange={(e) => setMyUpiId(e.target.value)} />
                <button onClick={saveMyUpi} disabled={savingUpi} className="btn-primary">Save UPI</button>
              </div>
              {payments.map((p) => (
                <div key={p.id} className="mb-2 rounded-lg border border-[#eadfcf] bg-[#fffdf8] px-3 py-2 text-sm">
                  <p>{p.from_name} {"->"} {p.to_name}: INR {Number(p.amount).toFixed(2)} ({p.status})</p>
                  {p.status === "marked_paid" && membership?.role === "owner" ? (
                    <button
                      onClick={() => handleConfirmReceived(p.id)}
                      className="mt-2 rounded bg-[#d4f5df] px-3 py-1 text-xs font-semibold text-[#1b5e20] hover:bg-[#bdeccf]"
                    >
                      Approve Received
                    </button>
                  ) : null}
                </div>
              ))}
            </Panel>
          </section>
        )}

        {activeTab === "Plan" && (
          <section className="space-y-6">
            <Panel title="Train">{trains.map((t) => <div key={t.id} className="mb-3 border-b pb-3"><p className="font-semibold">{t.direction}</p><p>{t.train_number}</p><p>{t.departure} {"->"} {t.arrival}</p><p>INR {Number(t.cost_per_person).toFixed(2)} per person</p>{isOwner ? <button onClick={() => handleEditTrain(t)} className="mt-2 rounded bg-amber-100 px-3 py-1 text-xs font-semibold hover:bg-amber-200">Edit Train</button> : null}</div>)}</Panel>
            {vehicle ? <Panel title="Vehicle"><p>{vehicle.vehicle_name}</p><p>Rent: INR {Number(vehicle.rent_amount).toFixed(2)}</p><p>Advance: INR {Number(vehicle.advance_paid).toFixed(2)}</p><p>Remaining: INR {Number(vehicle.remaining_balance).toFixed(2)}</p>{isOwner ? <button onClick={handleEditVehicle} className="mt-2 rounded bg-amber-100 px-3 py-1 text-xs font-semibold hover:bg-amber-200">Edit Vehicle</button> : null}</Panel> : null}
            {booking ? <Panel title="Stay"><p>{booking.property_name}</p><p>Booking ID: {booking.booking_id}</p><p>Total: INR {Number(booking.amount_paid).toFixed(2)}</p>{isOwner ? <button onClick={handleEditBooking} className="mt-2 rounded bg-amber-100 px-3 py-1 text-xs font-semibold hover:bg-amber-200">Edit Stay</button> : null}</Panel> : null}
          </section>
        )}
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return <div className="rounded-2xl border border-[#eadfcf] bg-[#fff8ef]/90 p-5 shadow-xl backdrop-blur"><h3 className="mb-4 text-xl font-bold text-[#6b3e26]">{title}</h3>{children}</div>;
}
function StatCard({ title, value }) {
  return <div className="rounded-2xl border border-[#eadfcf] bg-[#fffdf8] p-5 shadow-lg"><p className="text-xs uppercase tracking-wide text-[#8d6d53]">{title}</p><p className="mt-2 text-3xl font-black text-[#6b3e26]">{value}</p></div>;
}
function StatMini({ label, value }) {
  return <div className="rounded-xl border border-[#eadfcf] bg-[#fffdf8] p-3"><p className="text-xs text-[#8d6d53]">{label}</p><p className="font-bold text-[#6b3e26]">{value}</p></div>;
}
