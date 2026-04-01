import React from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { Toaster, sileo } from "https://esm.sh/sileo?deps=react@18.3.1,react-dom@18.3.1";

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

async function parseJsonResponse(response) {
    const rawText = await response.text();

    try {
        return JSON.parse(rawText);
    } catch (error) {
        console.error("Invalid JSON response:", rawText);
        throw new Error(
            "Server returned invalid JSON. Check your PHP file for warnings or mixed output."
        );
    }
}

const toasterOptions = {
    fill: "#111111",
    roundness: 18,
    styles: {
        title: "text-white! text-[15px] font-semibold!",
        description: "text-white/80! text-[13px]!",
        badge: "bg-white/10!",
        button: "bg-white/10! text-white! hover:bg-white/15!"
    }
};

function ProfilePage() {
    const [profile, setProfile] = React.useState(null);
    const [form, setForm] = React.useState({
        full_name: "",
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
    const [activeSection, setActiveSection] = React.useState(null); // null | "personal" | "contact"

    const hydrateForm = React.useCallback((data) => {
        setProfile(data);
        setForm({
            full_name: data.name || "",
            email: data.email || "",
            contact: data.contact || "",
            address: data.address || ""
        });
        setPreviewUrl(data.profile_image_url || "");
        setRemoveImage(false);
    }, []);

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
                setPageError("");
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
    }, [hydrateForm]);

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

    const handleStartEdit = (section) => {
        if (profile) {
            hydrateForm(profile);
        }
        setSelectedImage(null);
        setRemoveImage(false);
        setPageError("");
        setActiveSection(section);
    };

    const handleCancelEdit = () => {
        if (profile) {
            hydrateForm(profile);
        }
        setSelectedImage(null);
        setRemoveImage(false);
        setPageError("");
        setActiveSection(null);
    };

    const handleImageChange = (e) => {
        const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
        if (!file) return;

        const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
        const maxSize = 15 * 1024 * 1024;

        if (!allowedTypes.includes(file.type)) {
            sileo.error({
                title: "Invalid image type",
                description: "Please upload a PNG, JPEG, or WEBP image."
            });
            return;
        }

        if (file.size > maxSize) {
            sileo.error({
                title: "Image too large",
                description: "Please upload an image under 15MB."
            });
            return;
        }

        setSelectedImage(file);
        setRemoveImage(false);

        sileo.info({
            title: "Picture selected",
            description: "Click Save changes to upload the new image."
        });
    };

    const handleRemoveImage = () => {
        if (!previewUrl && !selectedImage) {
            sileo.info({
                title: "No picture to remove",
                description: "There is no profile picture set yet."
            });
            return;
        }

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
        setPageError("");

        const formData = new FormData();
        formData.append("name", form.full_name.trim());
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
                    description:
                        activeSection === "contact"
                            ? "Updating your contact information."
                            : selectedImage
                                ? "Uploading your profile picture."
                                : removeImage
                                    ? "Removing your profile picture."
                                    : "Updating your personal information."
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
            setActiveSection(null);

            window.dispatchEvent(
                new CustomEvent("profile-updated", {
                    detail: data.profile
                })
            );
        } catch (error) {
            console.error(error);
            setPageError(error.message || "Something went wrong.");
        } finally {
            setSaving(false);
        }
    };

    const displayName = form.full_name.trim() || profile?.name || "User";
    const avatarSrc = previewUrl || buildAvatarUrl(displayName);

    const staticEmployeeId = profile?.employee_id || "SJ53862";
    const staticDepartmentId = profile?.department_id || "DPT-001";
    const staticGender = profile?.gender || "Female";
    const staticDateOfBirth = profile?.date_of_birth || "05 March, 1996";

    if (loading) {
        return (
            <>
                <Toaster position="top-center" offset={{ top: 24 }} options={toasterOptions} />
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
                <Toaster position="top-center" offset={{ top: 24 }} options={toasterOptions} />
                <div className="account-shell">
                    <div className="account-card">
                        <div className="account-error">{pageError}</div>
                    </div>
                </div>
            </>
        );
    }

    const isEditing = activeSection !== null;

    return (
        <>
            <Toaster position="top-center" offset={{ top: 24 }} options={toasterOptions} />

            <div className="account-shell">
                <div className="account-card">
                    <div className="account-top">
                        <h4>Account settings</h4>
                        <p>Preview your account details and edit them by section.</p>
                    </div>

                    {pageError && profile ? (
                        <div className="account-alert error">{pageError}</div>
                    ) : null}

                    {!isEditing ? (
                        <div className="staff-preview-shell">
                            <div className="staff-hero-card">
                                <div className="staff-hero-left">
                                    <img
                                        src={avatarSrc}
                                        alt="Profile preview"
                                        className="staff-hero-avatar"
                                    />

                                    <div className="staff-hero-identity">
                                        <h5>{displayName}</h5>
                                        <p>
                                            <span>{profile?.role || "—"}</span>
                                            <span className="staff-hero-dot">|</span>
                                            <span>{profile?.department_name || "—"}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="staff-hero-divider"></div>

                                <div className="staff-hero-meta">
                                    <div className="staff-meta-item">
                                        <span>Role</span>
                                        <strong>{profile?.role || "—"}</strong>
                                    </div>

                                    <div className="staff-meta-item">
                                        <span>Employee ID</span>
                                        <strong>{staticEmployeeId}</strong>
                                    </div>

                                    <div className="staff-meta-item">
                                        <span>Department</span>
                                        <strong>{profile?.department_name || "—"}</strong>
                                    </div>

                                    <div className="staff-meta-item">
                                        <span>Department ID</span>
                                        <strong>{staticDepartmentId}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="staff-preview-grid">
                                <section className="staff-info-card staff-card-personal">
                                    <div className="staff-info-card-head">
                                        <h6>Personal information</h6>

                                        <button
                                            type="button"
                                            className="staff-card-edit"
                                            onClick={() => handleStartEdit("personal")}
                                            aria-label="Edit personal information"
                                        >
                                            <i className="bi bi-pencil-fill"></i>
                                        </button>
                                    </div>

                                    <div className="staff-info-divider"></div>

                                    <div className="staff-info-grid">
                                        <div className="staff-info-item">
                                            <span>Full name</span>
                                            <strong>{form.full_name || "—"}</strong>
                                        </div>

                                        <div className="staff-info-item">
                                            <span>Gender</span>
                                            <strong>{staticGender}</strong>
                                        </div>

                                        <div className="staff-info-item">
                                            <span>Date of birth</span>
                                            <strong>{staticDateOfBirth}</strong>
                                        </div>

                                        <div className="staff-info-item full-span">
                                            <span>Address</span>
                                            <strong>{form.address || "—"}</strong>
                                        </div>
                                    </div>
                                </section>

                                <section className="staff-info-card staff-card-contact">
                                    <div className="staff-info-card-head">
                                        <h6>Contact information</h6>

                                        <button
                                            type="button"
                                            className="staff-card-edit"
                                            onClick={() => handleStartEdit("contact")}
                                            aria-label="Edit contact information"
                                        >
                                            <i className="bi bi-pencil-fill"></i>
                                        </button>
                                    </div>

                                    <div className="staff-info-divider"></div>

                                    <div className="staff-info-grid staff-info-grid-single">
                                        <div className="staff-info-item">
                                            <span>Contact number</span>
                                            <strong>{form.contact || "—"}</strong>
                                        </div>

                                        <div className="staff-info-item">
                                            <span>Email</span>
                                            <strong>{form.email || "—"}</strong>
                                        </div>
                                    </div>
                                </section>

                                <section className="staff-info-card staff-card-account">
                                    <div className="staff-info-card-head">
                                        <h6>Account information</h6>
                                    </div>

                                    <div className="staff-info-divider"></div>

                                    <div className="staff-info-grid staff-info-grid-single">
                                        <div className="staff-info-item">
                                            <span>Department</span>
                                            <strong>{profile?.department_name || "—"}</strong>
                                        </div>

                                        <div className="staff-info-item">
                                            <span>Role</span>
                                            <strong>{profile?.role || "—"}</strong>
                                        </div>

                                        <div className="staff-info-item">
                                            <span>Employee ID</span>
                                            <strong>{staticEmployeeId}</strong>
                                        </div>

                                        <div className="staff-info-item">
                                            <span>Department ID</span>
                                            <strong>{staticDepartmentId}</strong>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="section-edit-form">
                                <div className="editor-panel">
                                    <div className="editor-header">
                                        <div>
                                            <h5>
                                                {activeSection === "contact"
                                                    ? "Contact Information"
                                                    : "Personal Information"}
                                            </h5>
                                            <p>
                                                {activeSection === "contact"
                                                    ? "Edit your contact details"
                                                    : "Edit your personal informations"}
                                            </p>
                                        </div>
                                    </div>

                                    {activeSection === "personal" ? (
                                        <>
                                            <div className="editor-media-row">
                                                <img
                                                    src={avatarSrc}
                                                    alt="Profile preview"
                                                    className="editor-avatar"
                                                />

                                                <div className="editor-avatar-actions">
                                                    <label className="editor-upload-btn">
                                                        Upload An Image
                                                        <input
                                                            type="file"
                                                            accept="image/png,image/jpeg,image/webp"
                                                            hidden
                                                            onChange={handleImageChange}
                                                        />
                                                    </label>

                                                    <button
                                                        type="button"
                                                        className="editor-trash-btn"
                                                        onClick={handleRemoveImage}
                                                        aria-label="Remove image"
                                                    >
                                                        <i className="bi bi-trash3-fill"></i>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="editor-divider"></div>

                                            <div className="editor-grid">
                                                <div className="editor-field editor-field-full">
                                                    <label className="editor-label">
                                                        Full name <span className="required">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="editor-input"
                                                        name="full_name"
                                                        value={form.full_name}
                                                        onChange={handleChange}
                                                        required
                                                    />
                                                </div>

                                                <div className="editor-field">
                                                    <label className="editor-label">Gender</label>
                                                    <input
                                                        type="text"
                                                        className="editor-input editor-input-static"
                                                        value={staticGender}
                                                        readOnly
                                                        disabled
                                                    />
                                                </div>

                                                <div className="editor-field">
                                                    <label className="editor-label">Date of birth</label>
                                                    <input
                                                        type="text"
                                                        className="editor-input editor-input-static"
                                                        value={staticDateOfBirth}
                                                        readOnly
                                                        disabled
                                                    />
                                                </div>

                                                <div className="editor-field editor-field-full">
                                                    <label className="editor-label">Address</label>
                                                    <textarea
                                                        className="editor-textarea"
                                                        name="address"
                                                        rows="4"
                                                        value={form.address}
                                                        onChange={handleChange}
                                                        placeholder="Enter address"
                                                    ></textarea>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="editor-divider"></div>

                                            <div className="editor-grid">
                                                <div className="editor-field">
                                                    <label className="editor-label">
                                                        Email <span className="required">*</span>
                                                    </label>
                                                    <input
                                                        type="email"
                                                        className="editor-input"
                                                        name="email"
                                                        value={form.email}
                                                        onChange={handleChange}
                                                        required
                                                    />
                                                </div>

                                                <div className="editor-field">
                                                    <label className="editor-label">
                                                        Contact number <span className="required">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="editor-input"
                                                        name="contact"
                                                        value={form.contact}
                                                        onChange={handleChange}
                                                        placeholder="Enter contact number"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="editor-actions">
                                        <button
                                            type="button"
                                            className="btn account-btn-soft"
                                            onClick={handleCancelEdit}
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="submit"
                                            className="btn account-save-btn"
                                            disabled={saving}
                                        >
                                            {saving ? "Saving..." : "Save changes"}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                </div>
            </div>
        </>
    );
}

createRoot(document.getElementById("root")).render(<ProfilePage />);