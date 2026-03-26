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
    <div className="container page-stack page-pad">
      <ToastBanner message={banner} />
      <PageIntro
        eyebrow="Profile"
        title="Manage the rider identity used by the booking system"
        description="The form below updates `/users/profile` so the backend remains the source of truth for rider details."
      />

      <section className="content-grid profile-grid">
        <div className="panel profile-aside">
          <div className="profile-avatar">
            {profilePicture ? <img src={profilePicture} alt={name} /> : <HiOutlineUserCircle size={64} />}
          </div>
          <strong>{user?.name}</strong>
          <span>{user?.email}</span>
          <div className="mini-list full-width">
            <div className="mini-card">
              <div>
                <strong>Role</strong>
                <span>{user?.role}</span>
              </div>
              <HiOutlineIdentification size={18} />
            </div>
            <div className="mini-card">
              <div>
                <strong>Phone</strong>
                <span>{user?.phoneNumber || "Not set"}</span>
              </div>
              <HiOutlinePhone size={18} />
            </div>
          </div>
        </div>

        <div className="panel">
          <form className="form-stack" onSubmit={handleSubmit}>
            <label className="field">
              <span>Name</span>
              <input type="text" value={name} onChange={(event) => setName(event.target.value)} required />
            </label>

            <label className="field">
              <span>Phone number</span>
              <input type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} />
            </label>

            <label className="field">
              <span>Profile picture URL</span>
              <input type="url" value={profilePicture} onChange={(event) => setProfilePicture(event.target.value)} />
            </label>

            {error ? <InlineMessage message={error} tone="error" /> : null}

            <button type="submit" className="solid-button" disabled={isBusy}>
              {isBusy ? "Saving..." : "Save profile"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
