import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { signInWithPopup, signInWithRedirect } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
        { email, password }
      );

      localStorage.setItem("token", res.data.token);
      navigate("/dashboard");
    } catch (err) {
      alert("Invalid Credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const res = await axios.post("http://localhost:5000/api/auth/google", {
        name: user.displayName,
        email: user.email,
        googleUid: user.uid,
        avatarUrl: user.photoURL
      });

      localStorage.setItem("token", res.data.token);
      navigate("/dashboard");
    } catch (err) {
      const code = err?.code || "unknown_error";
      if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      alert(`Google login failed: ${code}`);
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-200">
    <div className="bg-white p-8 rounded-2xl shadow-xl w-96">
      <h1 className="text-3xl font-bold text-center mb-6 text-indigo-600">
        TripBuddy
      </h1>

      <input
        type="email"
        placeholder="Email"
        className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        className="w-full p-3 mb-6 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        onClick={handleLogin}
        className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition duration-300 disabled:opacity-60"
        disabled={loading}
      >
        {loading ? "Please wait..." : "Login"}
      </button>

      <button
        onClick={handleGoogleLogin}
        className="w-full mt-3 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-100 transition duration-300 disabled:opacity-60"
        disabled={loading}
      >
        Continue with Google
      </button>
    </div>
  </div>
);

}
