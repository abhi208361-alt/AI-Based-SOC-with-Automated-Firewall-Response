import { useState, useEffect } from "react";
import PageShell from "../components/PageShell";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import {
  changePasswordApi,
  updateProfileApi,
} from "../services/api";

function Panel({ title, children }) {
  return (
    <div className="rounded-lg border border-cyan-900/70 bg-[#061a31] shadow-[0_0_20px_rgba(0,100,255,0.08)]">
      <div className="border-b border-cyan-900/60 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function normalizeStoredProfile(profile) {
  if (!profile) return null;

  return {
    id: profile.id || profile._id || "N/A",
    email: profile.email || "",
    full_name: profile.full_name || profile.name || "",
    role: profile.role || "admin",
  };
}

export default function SettingsPage({ profile, onLogout }) {
  const [currentProfile, setCurrentProfile] = useState(
    normalizeStoredProfile(profile)
  );

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function persistProfile(updatedProfile) {
    const safeProfile = normalizeStoredProfile(updatedProfile);
    if (!safeProfile) return;

    setCurrentProfile(safeProfile);

    if (typeof window !== "undefined") {
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...safeProfile,
          full_name: safeProfile.full_name,
          email: safeProfile.email,
          role: safeProfile.role,
        })
      );

      localStorage.setItem(
        "user_profile",
        JSON.stringify({
          ...safeProfile,
          full_name: safeProfile.full_name,
          email: safeProfile.email,
          role: safeProfile.role,
        })
      );
    }
  }

  useEffect(() => {
    const storedUser =
      typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("user") || "null")
        : null;

    const incoming = normalizeStoredProfile(profile || storedUser);

    if (incoming) {
      setCurrentProfile(incoming);
      setFullName(incoming.full_name || "");
      setEmail(incoming.email || "");
    }
  }, [profile]);

  useEffect(() => {
    if (profileMessage) {
      const timer = setTimeout(() => setProfileMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [profileMessage]);

  useEffect(() => {
    if (passwordMessage) {
      const timer = setTimeout(() => setPasswordMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [passwordMessage]);

  useEffect(() => {
    if (profileError) {
      const timer = setTimeout(() => setProfileError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [profileError]);

  useEffect(() => {
    if (passwordError) {
      const timer = setTimeout(() => setPasswordError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [passwordError]);

  async function updateProfile(event) {
    event.preventDefault();
    setProfileError("");
    setProfileMessage("");

    if (!fullName.trim()) {
      setProfileError("Full name is required");
      return;
    }

    if (!email.trim()) {
      setProfileError("Email is required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setProfileError("Invalid email format");
      return;
    }

    setProfileLoading(true);

    try {
      const response = await updateProfileApi({
        full_name: fullName.trim(),
        email: email.trim(),
      });

      const updatedProfile = response?.data || {
        id: currentProfile?.id || "N/A",
        full_name: fullName.trim(),
        email: email.trim(),
        role: currentProfile?.role || "admin",
      };

      persistProfile(updatedProfile);
      setProfileMessage("✓ Profile updated successfully.");

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("profile-updated", {
            detail: updatedProfile,
          })
        );
      }
    } catch (err) {
      const errorMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update profile";
      setProfileError(errorMsg);
    } finally {
      setProfileLoading(false);
    }
  }

  async function updatePassword(event) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (!currentPassword) {
      setPasswordError("Current password is required");
      return;
    }

    if (!newPassword) {
      setPasswordError("New password is required");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        "New password must be different from current password"
      );
      return;
    }

    setPasswordLoading(true);

    try {
      await changePasswordApi({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("✓ Password changed successfully.");
    } catch (err) {
      const errorMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to change password";
      setPasswordError(errorMsg);
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <PageShell
      title="Settings"
      profile={currentProfile || profile}
      onLogout={onLogout}
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            Account Settings
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage your profile and security settings
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Panel title="Profile Information">
            <form onSubmit={updateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  className="w-full rounded-lg border border-cyan-900 bg-[#041326] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full rounded-lg border border-cyan-900 bg-[#041326] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>

              {profileError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <AlertCircle
                    size={16}
                    className="text-red-400 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-red-300">{profileError}</p>
                </div>
              )}

              {profileMessage && (
                <div className="flex items-start gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                  <CheckCircle2
                    size={16}
                    className="text-green-400 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-green-300">{profileMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={profileLoading}
                className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white transition"
              >
                {profileLoading ? "Updating..." : "Update Profile"}
              </button>
            </form>
          </Panel>

          <Panel title="Change Password">
            <form onSubmit={updatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="w-full rounded-lg border border-cyan-900 bg-[#041326] px-3 py-2 pr-10 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowCurrentPassword(!showCurrentPassword)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  >
                    {showCurrentPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 8 characters)"
                    required
                    minLength="8"
                    className="w-full rounded-lg border border-cyan-900 bg-[#041326] px-3 py-2 pr-10 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  >
                    {showNewPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    minLength="8"
                    className="w-full rounded-lg border border-cyan-900 bg-[#041326] px-3 py-2 pr-10 text-sm text-white placeholder-slate-600 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>

              {newPassword && (
                <div className="rounded-lg bg-[#041326] p-3">
                  <p className="text-xs font-semibold text-slate-400 mb-2">
                    Password Requirements:
                  </p>
                  <div className="space-y-1 text-xs">
                    <p
                      className={
                        newPassword.length >= 8
                          ? "text-green-400"
                          : "text-slate-500"
                      }
                    >
                      ✓ At least 8 characters
                    </p>
                    <p
                      className={
                        /[A-Z]/.test(newPassword)
                          ? "text-green-400"
                          : "text-slate-500"
                      }
                    >
                      {/[A-Z]/.test(newPassword) ? "✓" : "○"} Contains uppercase letter
                    </p>
                    <p
                      className={
                        /[0-9]/.test(newPassword)
                          ? "text-green-400"
                          : "text-slate-500"
                      }
                    >
                      {/[0-9]/.test(newPassword) ? "✓" : "○"} Contains number
                    </p>
                    <p
                      className={
                        newPassword !== currentPassword
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {newPassword !== currentPassword ? "✓" : "✗"} Different from current
                      password
                    </p>
                  </div>
                </div>
              )}

              {passwordError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <AlertCircle
                    size={16}
                    className="text-red-400 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-red-300">{passwordError}</p>
                </div>
              )}

              {passwordMessage && (
                <div className="flex items-start gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                  <CheckCircle2
                    size={16}
                    className="text-green-400 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-green-300">{passwordMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white transition"
              >
                {passwordLoading ? "Changing..." : "Change Password"}
              </button>
            </form>
          </Panel>
        </div>

        <Panel title="Account Information">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Account ID</p>
              <p className="mt-1 text-sm font-mono text-cyan-300">
                {currentProfile?.id || profile?.id || "N/A"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Role</p>
              <p className="mt-1 text-sm font-semibold capitalize text-cyan-300">
                {currentProfile?.role || profile?.role || "N/A"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Status</p>
              <p className="mt-1 flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-300">Active</span>
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}