import React from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { Toaster, sileo } from "https://esm.sh/sileo?deps=react@18.3.1,react-dom@18.3.1";

function splitFullName(fullName = "") {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
        return { firstName: "", lastName: "" };
    }

    return {
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" ")
    };
}

function buildAvatarUrl(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name || "User"
    )}&background=e9c7d5&color=222&size=180`;
}

function SectionHeader({ title, subtitle }) {
    return (
        <div className="account-section-header">
            <h6>{title}</h6>
            {subtitle ? <p>{subtitle}</p> : null}
        </div>
    );
}

function StaticPasswordField({ label, value = "••••••••••" }) {
    return (
        <div className="account-field">
            <label className="form-label">{label}</label>
            <div className="password-shell">
                <span className="password-shell-icon">
                    <i className="bi bi-lock"></i>
                </span>

                <input
                    type="password"
                    className="form-control password-static-input"
                    value={value}
                    readOnly
                    disabled
                />

                <button
                    type="button"
                    className="password-shell-action"
                    tabIndex="-1"
                >
                    <i className="bi bi-eye"></i>
                </button>
            </div>
        </div>
    );
}

async function parseJsonResponse(response) {
    const rawText = await response.text();

    try {
        return JSON.parse(rawText);
    } catch (error) {
        console.error("Invalid JSON response:", rawText);
        throw new Error("Server returned invalid JSON. Check your PHP file for warnings or mixed output.");
    }
}

function ProfilePage() {
    const [profile, setProfile] = React.useState(null);
    const [form, setForm] = React.useState({
        first_name: "",
        last_name: "",
        email: "",
        contact: "",
        address: ""
    });

    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [pageError, setPageError] = React.useState("");
    const [selectedImage, setSelectedImage] = React.useState(null);
    const [previewUrl, setPreviewUrl] = React.useState("");
    const [removeImage, setRemoveImage] = React.useState(false);

    const hydrateForm = (data) => {
        const { firstName, lastName } = splitFullName(data.name || "");

        setProfile(data);
        setForm({
            first_name: firstName,
            last_name: lastName,
            email: data.email || "",
            contact: data.contact || "",
            address: data.address || ""
        });
        setPreviewUrl(data.profile_image_url || "");
        setRemoveImage(false);
    };

    React.useEffect(() => {
        let mounted = true;

        async function loadProfile() {
            try {
                const res = await fetch("php/get_profile.php", {
                    credentials: "same-origin"
                });

                const data = await parseJsonResponse(res);

                if (!res.ok || data.error) {
                    throw new Error(data.error || "Failed to load profile");
                }

                if (!mounted) return;
                hydrateForm(data);
                setLoading(false);
            } catch (error) {
                if (!mounted) return;
                setPageError(error.message || "Failed to load profile");
                setLoading(false);
            }
        }

        loadProfile();

        return () => {
            mounted = false;
        };
    }, []);

    React.useEffect(() => {
        if (!selectedImage) return;

        const objectUrl = URL.createObjectURL(selectedImage);
        setPreviewUrl(objectUrl);

        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [selectedImage]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
        if (!file) return;

        setSelectedImage(file);
        setRemoveImage(false);

        sileo.info({
            title: "Picture selected",
            description: "Click Save changes to upload the new image."
        });
    };

    const handleRemoveImage = () => {
        setSelectedImage(null);
        setPreviewUrl("");
        setRemoveImage(true);

        sileo.warning({
            title: "Picture removed from preview",
            description: "Click Save changes to permanently delete it."
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        const mergedName = `${form.first_name} ${form.last_name}`.trim();

        const formData = new FormData();
        formData.append("name", mergedName);
        formData.append("email", form.email);
        formData.append("contact", form.contact);
        formData.append("address", form.address);

        if (removeImage) {
            formData.append("remove_profile_image", "1");
        }

        if (selectedImage) {
            formData.append("profile_image", selectedImage);
        }

        const request = fetch("php/update_profile.php", {
            method: "POST",
            body: formData,
            credentials: "same-origin"
        }).then(async (res) => {
            const data = await parseJsonResponse(res);

            if (!res.ok || data.error) {
                throw new Error(data.error || "Failed to update profile");
            }

            return data;
        });

        try {
            const data = await sileo.promise(request, {
                loading: {
                    title: "Saving profile...",
                    description: selectedImage
                        ? "Uploading your profile picture."
                        : removeImage
                            ? "Removing your profile picture."
                            : "Updating your account details."
                },
                success: {
                    title: "Profile updated",
                    description: "Your changes were saved successfully."
                },
                error: (err) => ({
                    title: "Update failed",
                    description: err.message || "Something went wrong."
                })
            });

            hydrateForm(data.profile);
            setSelectedImage(null);
            setRemoveImage(false);

            window.dispatchEvent(
                new CustomEvent("profile-updated", {
                    detail: data.profile
                })
            );
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const displayName =
        `${form.first_name} ${form.last_name}`.trim() ||
        profile?.name ||
        "User";

    const avatarSrc = previewUrl || buildAvatarUrl(displayName);

    if (loading) {
        return (
            <>
                <Toaster
                    position="top-center"
                    offset={{ top: 24 }}
                    options={{
                        fill: "#111111",
                        roundness: 18,
                        styles: {
                            title: "text-white! text-[15px] font-semibold!",
                            description: "text-white/80! text-[13px]!",
                            badge: "bg-white/10!",
                            button: "bg-white/10! text-white! hover:bg-white/15!"
                        }
                    }}
                />
                <div className="account-shell">
                    <div className="account-card">
                        <div className="account-loading">Loading profile...</div>
                    </div>
                </div>
            </>
        );
    }

    if (pageError && !profile) {
        return (
            <>
                <Toaster
                    position="top-center"
                    offset={{ top: 24 }}
                    options={{
                        fill: "#111111",
                        roundness: 18,
                        styles: {
                            title: "text-white! text-[15px] font-semibold!",
                            description: "text-white/80! text-[13px]!",
                            badge: "bg-white/10!",
                            button: "bg-white/10! text-white! hover:bg-white/15!"
                        }
                    }}
                />
                <div className="account-shell">
                    <div className="account-card">
                        <div className="account-error">{pageError}</div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Toaster
                position="top-center"
                offset={{ top: 24 }}
                options={{
                    fill: "#111111",
                    roundness: 18,
                    styles: {
                        title: "text-white! text-[15px] font-semibold!",
                        description: "text-white/80! text-[13px]!",
                        badge: "bg-white/10!",
                        button: "bg-white/10! text-white! hover:bg-white/15!"
                    }
                }}
            />

            <div className="account-shell">
                <div className="account-card">
                    <div className="account-top">
                        <h4>Account</h4>
                        <p>Real-time information and activities of your property.</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="account-divider"></div>

                        <div className="profile-picture-row">
                            <div className="profile-picture-meta">
                                <img
                                    src={avatarSrc}
                                    alt="Profile preview"
                                    className="profile-picture-avatar"
                                />

                                <div>
                                    <div className="profile-picture-title">Profile picture</div>
                                    <div className="profile-picture-subtitle">
                                        PNG, JPEG under 15MB
                                    </div>
                                </div>
                            </div>

                            <div className="profile-picture-actions">
                                <label className="btn btn-light account-btn-soft mb-0">
                                    Upload new picture
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        hidden
                                        onChange={handleImageChange}
                                    />
                                </label>

                                <button
                                    type="button"
                                    className="btn btn-light account-btn-soft"
                                    onClick={handleRemoveImage}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>

                        <div className="account-divider"></div>

                        <section className="account-section">
                            <SectionHeader title="Full name" />

                            <div className="account-grid two-col">
                                <div className="account-field">
                                    <label className="form-label">First name</label>
                                    <input
                                        type="text"
                                        className="form-control account-input"
                                        name="first_name"
                                        value={form.first_name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                                <div className="account-field">
                                    <label className="form-label">Last name</label>
                                    <input
                                        type="text"
                                        className="form-control account-input"
                                        name="last_name"
                                        value={form.last_name}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </section>

                        <div className="account-divider"></div>

                        <section className="account-section">
                            <SectionHeader
                                title="Contact email"
                                subtitle="Manage your account email address for invoices."
                            />

                            <div className="account-grid email-row">
                                <div className="account-field">
                                    <label className="form-label">Email</label>

                                    <div className="input-icon-shell">
                                        <span className="input-icon-left">
                                            <i className="bi bi-envelope"></i>
                                        </span>
                                        <input
                                            type="email"
                                            className="form-control account-input with-left-icon"
                                            name="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="email-action-wrap">
                                    <button
                                        type="button"
                                        className="btn btn-light account-btn-soft add-email-btn"
                                    >
                                        <i className="bi bi-plus-circle me-2"></i>
                                        Add another email
                                    </button>
                                </div>
                            </div>
                        </section>

                        <div className="account-divider"></div>

                        <section className="account-section">
                            <SectionHeader
                                title="Password"
                                subtitle="Modify your current password."
                            />

                            <div className="account-grid two-col">
                                <StaticPasswordField label="Current password" />
                                <StaticPasswordField label="New password" />
                            </div>
                        </section>

                        <div className="account-divider"></div>

                        <section className="account-section">
                            <SectionHeader
                                title="Contact details"
                                subtitle="Update your personal contact information."
                            />

                            <div className="account-grid two-col">
                                <div className="account-field">
                                    <label className="form-label">Contact</label>
                                    <input
                                        type="text"
                                        className="form-control account-input"
                                        name="contact"
                                        value={form.contact}
                                        onChange={handleChange}
                                        placeholder="Enter contact number"
                                    />
                                </div>

                                <div className="account-field">
                                    <label className="form-label">Department ID</label>
                                    <input
                                        type="text"
                                        className="form-control account-input readonly"
                                        value={profile?.department_id || ""}
                                        readOnly
                                    />
                                </div>

                                <div className="account-field full-span">
                                    <label className="form-label">Address</label>
                                    <textarea
                                        className="form-control account-input account-textarea"
                                        name="address"
                                        rows="4"
                                        value={form.address}
                                        onChange={handleChange}
                                        placeholder="Enter address"
                                    ></textarea>
                                </div>
                            </div>
                        </section>

                        <div className="account-divider"></div>

                        <section className="account-section">
                            <SectionHeader title="Account details" />

                            <div className="account-grid two-col">
                                <div className="account-field">
                                    <label className="form-label">Role</label>
                                    <input
                                        type="text"
                                        className="form-control account-input readonly"
                                        value={profile?.role || ""}
                                        readOnly
                                    />
                                </div>

                                <div className="account-field">
                                    <label className="form-label">Department</label>
                                    <input
                                        type="text"
                                        className="form-control account-input readonly"
                                        value={profile?.department_name || ""}
                                        readOnly
                                    />
                                </div>
                            </div>
                        </section>

                        <div className="account-footer">
                            <button
                                type="submit"
                                className="btn account-save-btn"
                                disabled={saving}
                            >
                                {saving ? "Saving..." : "Save changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

createRoot(document.getElementById("root")).render(<ProfilePage />);