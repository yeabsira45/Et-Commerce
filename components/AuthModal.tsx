"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "./AppContext";
import { SearchableSelect } from "./form/SearchableSelect";
import { ETHIOPIAN_CITIES } from "@/lib/cities";
import { readPersistedUser } from "@/lib/localProfile";
import { validatePassword } from "@/lib/passwordRules";
import { Avatar } from "./Avatar";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: "login" | "register";
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function AuthModal({ open, onClose, onSuccess, initialMode }: Props) {
  const { login, register } = useAppContext();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [city, setCity] = useState("");
  const [subcity, setSubcity] = useState("");
  const [area, setArea] = useState("");
  const [phone, setPhone] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [avatarToast, setAvatarToast] = useState<string | null>(null);
  const [inlineWelcome, setInlineWelcome] = useState<string | null>(null);
  const [registerWelcome, setRegisterWelcome] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const effectiveStoreName = useMemo(() => {
    const trimmed = storeName.trim();
    if (trimmed) return trimmed;
    return fullName.trim() ? `${fullName.trim()}'s Store` : "";
  }, [fullName, storeName]);

  const selectedCityNode = ETHIOPIAN_CITIES.find((item) => item.value === city);

  useEffect(() => {
    if (open) {
      setRender(true);
      setClosing(false);
      if (initialMode) setMode(initialMode);
      return;
    }

    if (render) {
      setClosing(true);
      const timer = setTimeout(() => {
        setRender(false);
        setClosing(false);
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [open, render, initialMode]);

  useEffect(() => {
    let active = true;

    async function syncSlug() {
      const base = slugify(effectiveStoreName);
      if (!base) {
        if (active) setSlug("");
        return;
      }

      try {
        const res = await fetch(`/api/check-slug?slug=${encodeURIComponent(base)}`);
        const data = await res.json();
        if (active) setSlug(data.uniqueSlug || base);
      } catch {
        if (active) setSlug(base);
      }
    }

    syncSlug();
    return () => {
      active = false;
    };
  }, [effectiveStoreName]);

  useEffect(() => {
    if (!profileImageFile) {
      setProfilePreviewUrl("");
      return;
    }
    const nextUrl = URL.createObjectURL(profileImageFile);
    setProfilePreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [profileImageFile]);

  useEffect(() => {
    if (!avatarToast) return;
    const timer = window.setTimeout(() => setAvatarToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [avatarToast]);

  useEffect(() => {
    setInlineWelcome(null);
    setRegisterWelcome(null);
  }, [mode, open]);

  if (!render) return null;

  const passwordsMatch = mode === "login" || password === confirmPassword;
  const passwordError = mode === "register" ? validatePassword(password) : null;
  const missingRequiredFields = mode === "register"
    ? {
        fullName: !fullName.trim(),
        email: !email.trim(),
        password: !password,
        confirmPassword: !confirmPassword,
        city: !city,
        subcity: !subcity,
        phone: !phone.trim(),
      }
    : null;

  function focusFirstInvalidField() {
    window.requestAnimationFrame(() => {
      const firstInvalid = formRef.current?.querySelector<HTMLElement>("[data-invalid='true'] input, [data-invalid='true'] button, [data-invalid='true'] textarea, [data-invalid='true'] .sellSelect");
      firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" });
      firstInvalid?.focus?.();
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    let ok = false;
    let registerError: string | null = null;

    if (mode === "login") {
      ok = await login(identifier.trim(), password);
    } else {
      if (!fullName.trim() || !email.trim() || !password || !confirmPassword || !city || !subcity || !phone.trim()) {
        setLoading(false);
        setError("Please fill all required fields.");
        focusFirstInvalidField();
        return;
      }
      if (passwordError) {
        setLoading(false);
        setError(passwordError);
        focusFirstInvalidField();
        return;
      }
      if (!passwordsMatch) {
        setLoading(false);
        setError("Passwords do not match.");
        focusFirstInvalidField();
        return;
      }
      if (!city || !subcity) {
        setLoading(false);
        setError("Please select both city and subcity.");
        focusFirstInvalidField();
        return;
      }

      const result = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        storeName: storeName.trim() || undefined,
        city,
        area: subcity,
        street: area.trim() || undefined,
        phone: phone.trim(),
        profileImageFile,
      });
      ok = result.ok;
      registerError = result.error || null;
    }

    setLoading(false);

    if (!ok) {
      setError(registerError || "Authentication failed. Check your details and try again.");
      return;
    }

    if (mode === "register") {
      const persistedUser = readPersistedUser();
      const welcomeName = persistedUser?.fullName || persistedUser?.username || "there";
      setRegisterWelcome(`😉 Welcome ${welcomeName} !`);
      window.setTimeout(() => {
        setIdentifier("");
        setFullName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setStoreName("");
        setSlug("");
        setCity("");
        setSubcity("");
        setArea("");
        setPhone("");
        setProfileImageFile(null);
        setProfilePreviewUrl("");
        setRegisterWelcome(null);
        onClose();
        onSuccess?.();
        router.push("/vendor/dashboard");
      }, 1100);
      return;
    }

    const persistedUser = readPersistedUser();
    const welcomeName = persistedUser?.fullName || persistedUser?.username || "there";
    setInlineWelcome(`😉 Welcome ${welcomeName} !`);
    window.setTimeout(() => {
      setIdentifier("");
      setFullName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setStoreName("");
      setSlug("");
      setCity("");
      setSubcity("");
      setArea("");
      setPhone("");
      setProfileImageFile(null);
      setProfilePreviewUrl("");
      setInlineWelcome(null);
      onClose();
      onSuccess?.();
    }, 900);
  }

  return (
    <>
      <div className={`modalOverlay ${closing ? "isClosing" : ""}`} role="dialog" aria-modal="true">
        <div className={`modalCard modalCardAuth ${closing ? "isClosing" : ""}`}>
          <div className="modalTabs">
            <button type="button" className={`modalTab ${mode === "login" ? "modalTabActive" : ""}`} onClick={() => setMode("login")}>
              Sign in
            </button>
            <button type="button" className={`modalTab ${mode === "register" ? "modalTabActive" : ""}`} onClick={() => setMode("register")}>
              Create account
            </button>
          </div>

          <h2 className="modalTitle">{mode === "login" ? "Sign in to continue" : "Create your account"}</h2>
          <p className="modalSub">
            {mode === "login"
              ? "Super Admin (development): type username demo and password password — no @ address. Everyone else can sign in with username, email, or phone."
              : "Create your vendor account to post listings and chat with other vendors."}
          </p>

          <form ref={formRef} className={`modalForm ${mode === "register" ? "modalFormPolished" : ""}`} onSubmit={handleSubmit}>
            {mode === "login" ? (
              <>
                <label className="modalField modalFieldFull">
                  <span className="modalLabel">Username, email, or phone</span>
                  <input
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setInlineWelcome(null);
                    }}
                    className="modalInput"
                    autoFocus
                    required
                    placeholder="demo"
                    autoComplete="username"
                  />
                </label>
                <label className="modalField modalFieldFull">
                  <span className="modalLabel">Password</span>
                  <div className="modalPasswordWrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setInlineWelcome(null);
                      }}
                      className="modalInput"
                      required
                    />
                    <button type="button" className="modalEyeBtn" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
                <div className={`authInlineSlot ${inlineWelcome ? "hasWelcome" : ""}`}>
                  <button type="button" className="modalTextLink authInlineSlotLink" onClick={() => setResetOpen(true)}>
                    Forgot Password?
                  </button>
                  <p className="modalSub modalToastInline authInlineSlotMessage">{inlineWelcome}</p>
                </div>
              </>
            ) : (
              <div className="modalGrid">
                {registerWelcome ? <p className="modalSub modalToastInline modalFieldFull">{registerWelcome}</p> : null}
                <div className="modalField modalFieldFull modalAvatarUpload">
                  <span className="modalLabel">Profile Picture (Optional)</span>
                  <div className="modalAvatarRow">
                    <div className="avatarBadgeWrap">
                      <Avatar name={fullName || "Vendor"} imageUrl={profilePreviewUrl || undefined} size={64} />
                      <span className="avatarEditBadge" aria-hidden="true">Edit</span>
                    </div>
                    <div className="modalAvatarActions">
                      <label className="modalUploadBtn">
                        {profileImageFile ? "Change Image" : "Upload Image"}
                        <input
                          type="file"
                          accept="image/*"
                          className="srOnly"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            setProfileImageFile(file);
                            setAvatarToast("Avatar ready to save.");
                          }}
                        />
                      </label>
                      {profileImageFile ? (
                        <button type="button" className="modalSecondary modalAvatarRemoveBtn" onClick={() => {
                          setProfileImageFile(null);
                          setAvatarToast("Avatar removed.");
                        }}>
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {avatarToast ? <p className="modalSub modalToastInline">{avatarToast}</p> : null}
                </div>
                <label className={`modalField ${missingRequiredFields?.fullName ? "modalFieldError" : ""}`} data-invalid={missingRequiredFields?.fullName ? "true" : "false"}>
                  <span className="modalLabel">Full Name</span>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={`modalInput ${missingRequiredFields?.fullName ? "modalInputError" : ""}`} autoFocus required />
                </label>
                <label className="modalField">
                  <span className="modalLabel">Store Name (Optional)</span>
                  <input value={storeName} onChange={(e) => setStoreName(e.target.value)} className="modalInput" placeholder={fullName.trim() ? `${fullName.trim()}'s Store` : "Your store name"} />
                </label>
                <div className={`modalField ${missingRequiredFields?.city ? "modalFieldError" : ""}`} data-invalid={missingRequiredFields?.city ? "true" : "false"}>
                  <SearchableSelect label="City" value={city} options={ETHIOPIAN_CITIES.map((item) => ({ value: item.value, label: item.label }))} placeholder="Select City" onChange={(next) => {
                    setCity(next);
                    setSubcity("");
                  }} />
                </div>
                <div className={`modalField ${missingRequiredFields?.subcity ? "modalFieldError" : ""}`} data-invalid={missingRequiredFields?.subcity ? "true" : "false"}>
                  <SearchableSelect
                    label="Subcity"
                    value={subcity}
                    placeholder={city ? "Select Subcity" : "Select City First"}
                    disabled={!city}
                    groups={selectedCityNode ? [{ label: selectedCityNode.label, options: selectedCityNode.subcities }] : undefined}
                    options={selectedCityNode?.subcities}
                    onChange={setSubcity}
                  />
                </div>
                <label className="modalField">
                  <span className="modalLabel">Area (Optional)</span>
                  <input value={area} onChange={(e) => setArea(e.target.value)} className="modalInput" placeholder="Neighborhood or landmark" />
                </label>
                <label className={`modalField ${missingRequiredFields?.phone ? "modalFieldError" : ""}`} data-invalid={missingRequiredFields?.phone ? "true" : "false"}>
                  <span className="modalLabel">Phone Number</span>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className={`modalInput ${missingRequiredFields?.phone ? "modalInputError" : ""}`} required />
                </label>
                <label className={`modalField ${missingRequiredFields?.email ? "modalFieldError" : ""}`} data-invalid={missingRequiredFields?.email ? "true" : "false"}>
                  <span className="modalLabel">Email</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`modalInput ${missingRequiredFields?.email ? "modalInputError" : ""}`} required />
                </label>
                <label className={`modalField ${missingRequiredFields?.password || Boolean(passwordError) ? "modalFieldError" : ""}`} data-invalid={missingRequiredFields?.password || Boolean(passwordError) ? "true" : "false"}>
                  <span className="modalLabel">Password</span>
                  <div className="modalPasswordWrap">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className={`modalInput ${missingRequiredFields?.password || Boolean(passwordError) ? "modalInputError" : ""}`} required />
                    <button type="button" className="modalEyeBtn" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {passwordError ? <p className="modalError">{passwordError}</p> : null}
                </label>
                <label className={`modalField ${missingRequiredFields?.confirmPassword || (!passwordsMatch && Boolean(confirmPassword)) ? "modalFieldError" : ""}`} data-invalid={missingRequiredFields?.confirmPassword || (!passwordsMatch && Boolean(confirmPassword)) ? "true" : "false"}>
                  <span className="modalLabel">Confirm Password</span>
                  <div className="modalPasswordWrap">
                    <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`modalInput ${missingRequiredFields?.confirmPassword || (!passwordsMatch && Boolean(confirmPassword)) ? "modalInputError" : ""}`} required />
                    <button type="button" className="modalEyeBtn" onClick={() => setShowConfirmPassword((current) => !current)} aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  {!passwordsMatch && confirmPassword ? <p className="modalError">Passwords do not match.</p> : null}
                </label>
                <p className="modalMutedText modalFieldFull">Use at least 8 characters with letters and a number or symbol.</p>
              </div>
            )}

            {error ? <p className="modalError">{error}</p> : null}
            <div className="modalActions">
              <button type="button" className="modalSecondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="modalPrimary" disabled={loading}>
                {loading ? "Please wait..." : "Continue"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {resetOpen ? (
        <div className="modalOverlay" role="dialog" aria-modal="true">
          <div className="modalCard">
            <h2 className="modalTitle">Reset password</h2>
            <p className="modalSub">Enter the email for your account and we will prepare a reset flow next.</p>
            <label className="modalField modalFieldFull">
              <span className="modalLabel">Email</span>
              <input className="modalInput" placeholder="Enter your email" value={resetEmail} onChange={(e) => {
                setResetEmail(e.target.value);
                setResetError(null);
                setResetMessage(null);
              }} />
            </label>
            {resetError ? <p className="modalError">{resetError}</p> : null}
            {resetMessage ? <p className="modalSub">{resetMessage}</p> : null}
            <div className="modalActions">
              <button type="button" className="modalSecondary" onClick={() => {
                setResetOpen(false);
                setResetEmail("");
                setResetError(null);
                setResetMessage(null);
              }}>
                Close
              </button>
              <button type="button" className="modalPrimary" onClick={() => {
                const trimmed = resetEmail.trim();
                if (!trimmed) {
                  setResetError("Please enter your email address.");
                  setResetMessage(null);
                  return;
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                  setResetError("Please enter a valid email address.");
                  setResetMessage(null);
                  return;
                }
                setResetError(null);
                setResetMessage(`Reset link UI prepared for ${trimmed}. Backend email delivery can be wired next.`);
              }}>
                Send reset link
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
