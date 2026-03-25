import { useEffect, useState } from "react";
import { HiOutlineIdentification, HiOutlinePhone, HiOutlineUserCircle } from "react-icons/hi2";
import { InlineMessage, ToastBanner } from "@/components/ui/Feedback";
import { PageIntro } from "@/components/ui/PageIntro";
import { useAuth } from "@/contexts/AuthContext";

export const ProfilePage = () => {
  const { user, saveProfile, isBusy } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || "");
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name || "");
    setPhoneNumber(user?.phoneNumber || "");
    setProfilePicture(user?.profilePicture || "");
  }, [user]);

  useEffect(() => {
    if (!banner) {
      return;
    }

    const timer = window.setTimeout(() => setBanner(null), 3500);
    return () => window.clearTimeout(timer);
  }, [banner]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setError(null);
      await saveProfile({ name, phoneNumber, profilePicture });
      setBanner("Profile saved successfully.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Profile update failed.");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 grid gap-6 pt-10 pb-16 md:pt-6 md:pb-12">
      <ToastBanner message={banner} />
      <PageIntro
        eyebrow="Profile"
        title="Manage the rider identity used by the booking system"
        description="The form below updates `/users/profile` so the backend remains the source of truth for rider details."
      />

      <section className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8 items-start">
        <div className="flex flex-col items-center p-8 bg-surface border border-surface-border rounded-lg shadow-soft text-center h-full">
          <div className="w-24 h-24 rounded-xl overflow-hidden bg-background flex items-center justify-center border-4 border-white shadow-md mb-4 ring-1 ring-surface-border">
            {profilePicture ? <img src={profilePicture} alt={name} className="w-full h-full object-cover" /> : <HiOutlineUserCircle size={64} className="text-muted/40" />}
          </div>
          <strong className="text-xl font-extrabold text-ink leading-none">{user?.name}</strong>
          <span className="text-sm text-muted mt-1 font-medium">{user?.email}</span>
          
          <div className="grid gap-3 w-full mt-8">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/60 border border-surface-border group">
              <div className="text-left">
                <strong className="block text-xs font-bold uppercase tracking-wider text-muted mb-0.5">Role</strong>
                <span className="text-ink font-semibold">{user?.role}</span>
              </div>
              <HiOutlineIdentification size={20} className="text-teal/40 group-hover:text-teal transition-colors" />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/60 border border-surface-border group">
              <div className="text-left">
                <strong className="block text-xs font-bold uppercase tracking-wider text-muted mb-0.5">Phone</strong>
                <span className="text-ink font-semibold">{user?.phoneNumber || "Not set"}</span>
              </div>
              <HiOutlinePhone size={20} className="text-teal/40 group-hover:text-teal transition-colors" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-surface border border-surface-border rounded-lg shadow-soft p-8 md:p-10">
          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted px-1">Full name</span>
              <input 
                type="text" 
                className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-3 text-ink focus:ring-2 focus:ring-teal/20 outline-none transition-all placeholder:text-muted/40"
                value={name} 
                onChange={(event) => setName(event.target.value)} 
                required 
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted px-1">Phone number</span>
              <input 
                type="tel" 
                className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-3 text-ink focus:ring-2 focus:ring-teal/20 outline-none transition-all placeholder:text-muted/40"
                value={phoneNumber} 
                onChange={(event) => setPhoneNumber(event.target.value)} 
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-muted px-1">Profile picture URL</span>
              <input 
                type="url" 
                className="w-full bg-white/60 border border-surface-border rounded-xl px-4 py-3 text-ink focus:ring-2 focus:ring-teal/20 outline-none transition-all placeholder:text-muted/40"
                value={profilePicture} 
                onChange={(event) => setProfilePicture(event.target.value)} 
              />
            </label>

            {error ? <InlineMessage message={error} tone="error" /> : null}

            <button 
              type="submit" 
              className="w-full md:w-max px-10 flex items-center justify-center py-3.5 mt-2 rounded-xl bg-gradient-to-br from-teal to-teal-deep text-white font-bold shadow-soft hover:translate-y-[-1px] active:scale-[0.98] transition-all disabled:opacity-50 disabled:translate-y-0" 
              disabled={isBusy}
            >
              {isBusy ? "Saving changes..." : "Save profile"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
