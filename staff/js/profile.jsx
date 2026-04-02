import React from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { sileo } from "https://esm.sh/sileo?deps=react@18.3.1,react-dom@18.3.1";

function getInitials(name) {
    if (!name) return "U";

    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";

    return parts
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}

async function parseJsonResponse(response) {
    const rawText = await response.text();

    try {
        return JSON.parse(rawText);
    } catch (error) {
        console.error("Invalid JSON response:", rawText);
        throw new Error("Server returned invalid JSON.");
    }
}

function Avatar({ src, name, size = 74 }) {
    if (src) {
        return (
            <img
                src={src}
                alt={name || "User"}
                className="rounded-circle border"
                style={{
                    width: size,
                    height: size,
                    objectFit: "cover",
                    flexShrink: 0
                }}
            />
        );
    }

    return (
        <div
            className="rounded-circle border d-inline-flex align-items-center justify-content-center fw-bold text-uppercase bg-secondary-subtle text-secondary-emphasis"
            style={{
                width: size,
                height: size,
                flexShrink: 0,
                fontSize: size >= 74 ? "1.35rem" : "1rem"
            }}
        >
            {getInitials(name)}
        </div>
    );
}

function InfoItem({ label, value, strong = true }) {
    return (
        <div>
            <div
                className="text-body-secondary"
                style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    marginBottom: "6px"
                }}
            >
                {label}
            </div>
            <div
                className={strong ? "fw-bold text-body" : "fw-semibold text-body"}
                style={{
                    fontSize: "16px",
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                    overflowWrap: "anywhere"
                }}
            >
                {value || "—"}
            </div>
        </div>
    );
}

function CardSection({ title, onEdit, children, bodyClassName = "" }) {
    return (
        <div
            className="card border shadow-sm bg-body-tertiary h-100"
            style={{ borderRadius: "16px" }}
        >
            <div className={`card-body p-4 ${bodyClassName}`}>
                <div className="d-flex align-items-center justify-content-between gap-3">
                    <h6
                        className="mb-0 fw-bold text-body"
                        style={{ fontSize: "22px" }}
                    >
                        {title}
                    </h6>

                    {onEdit ? (
                        <button
                            type="button"
                            className="btn btn-sm p-0 border-0 bg-transparent text-secondary"
                            onClick={onEdit}
                            aria-label={`Edit ${title}`}
                            style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "8px"
                            }}
                        >
                            <i className="bi bi-pencil-fill"></i>
                        </button>
                    ) : null}
                </div>

                <div className="border-top mt-3 pt-4">
                    {children}
                </div>
            </div>
        </div>
    );
}

function AlertMessage({ kind = "danger", children }) {
    return (
        <div className={`alert alert-${kind} mb-4`} role="alert">
            {children}
        </div>
    );
}

function ProfilePage() {
    const [profile, setProfile] = React.useState(null);
    const [form, setForm] = React.useState({
        full_name: "",
        nickname: "",
        email: "",
        contact: "",
        address: "",
        gender: "",
        date_of_birth: ""
    });

    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [pageError, setPageError] = React.useState("");
    const [selectedImage, setSelectedImage] = React.useState(null);
    const [previewUrl, setPreviewUrl] = React.useState("");
    const [removeImage, setRemoveImage] = React.useState(false);
    const [activeSection, setActiveSection] = React.useState(null);

    const fileInputRef = React.useRef(null);

    const hydrateForm = React.useCallback((data) => {
        setProfile(data);
        setForm({
            full_name: data.name || "",
            nickname: data.nickname || "",
            email: data.email || "",
            contact: data.contact || "",
            address: data.address || "",
            gender: data.gender || "",
            date_of_birth: data.date_of_birth || ""
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
            } catch (error) {
                if (!mounted) return;
                setPageError(error.message || "Failed to load profile");
            } finally {
                if (mounted) setLoading(false);
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
        if (profile) hydrateForm(profile);
        setSelectedImage(null);
        setRemoveImage(false);
        setPageError("");
        setActiveSection(section);
    };

    const handleCancelEdit = () => {
        if (profile) hydrateForm(profile);
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

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }

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
        formData.append("nickname", form.nickname.trim());
        formData.append("email", form.email.trim());
        formData.append("contact", form.contact.trim());
        formData.append("address", form.address.trim());
        formData.append("gender", form.gender);
        formData.append("date_of_birth", form.date_of_birth);

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
    const role = profile?.role || "—";
    const departmentName = profile?.department_name || "—";
    const employeeId = profile?.employee_id || "—";
    const departmentId = profile?.department_id || "—";
    const premiumEditCardStyle = {
        borderRadius: "28px",
        border: "1px solid var(--bs-border-color)",
        background: "linear-gradient(180deg, var(--bs-body-bg) 0%, var(--bs-tertiary-bg) 100%)",
        boxShadow: "0 18px 50px rgba(0,0,0,0.06)"
    };

    const premiumPanelStyle = {
        borderRadius: "22px",
        border: "1px solid var(--bs-border-color)",
        background: "var(--bs-body-bg)",
        boxShadow: "0 10px 28px rgba(0,0,0,0.04)"
    };

    const premiumMutedPanelStyle = {
        borderRadius: "20px",
        border: "1px solid var(--bs-border-color)",
        background: "var(--bs-tertiary-bg)"
    };

    const fieldStyle = {
        minHeight: "54px",
        borderRadius: "16px",
        paddingInline: "16px",
        fontSize: "15px",
        border: "1px solid var(--bs-border-color)",
        background: "var(--bs-body-bg)",
        boxShadow: "none"
    };

    const compactDateStyle = {
        minHeight: "46px",
        height: "46px",
        borderRadius: "14px",
        paddingInline: "14px",
        fontSize: "14px",
        maxWidth: "220px",
        border: "1px solid var(--bs-border-color)",
        background: "var(--bs-body-bg)",
        boxShadow: "none"
    };

    const textareaStyle = {
        minHeight: "124px",
        borderRadius: "18px",
        padding: "15px 16px",
        fontSize: "15px",
        border: "1px solid var(--bs-border-color)",
        background: "var(--bs-body-bg)",
        boxShadow: "none"
    };

    const labelStyle = {
        fontSize: "13px",
        fontWeight: 700,
        letterSpacing: "0.01em",
        marginBottom: "8px"
    };

    const primaryButtonStyle = {
        minHeight: "48px",
        minWidth: "150px",
        borderRadius: "14px",
        paddingInline: "22px",
        boxShadow: "0 10px 22px rgba(0,0,0,0.10)"
    };

    const secondaryButtonStyle = {
        minHeight: "48px",
        borderRadius: "14px",
        paddingInline: "18px"
    };

    const softIconButtonStyle = {
        minHeight: "46px",
        borderRadius: "14px",
        paddingInline: "18px"
    };
    if (loading) {
        return (
            <div className="w-100 pb-4">
                <div
                    className="card border shadow-sm bg-body"
                    style={{ borderRadius: "20px" }}
                >
                    <div className="card-body py-5">
                        <div className="d-flex align-items-center justify-content-center gap-3 text-body-secondary">
                            <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></div>
                            <span>Loading profile...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (pageError && !profile) {
        return (
            <div className="w-100 pb-4">
                <div
                    className="card border shadow-sm bg-body"
                    style={{ borderRadius: "20px" }}
                >
                    <div className="card-body p-4">
                        <AlertMessage>{pageError}</AlertMessage>
                    </div>
                </div>
            </div>
        );
    }

    const isEditing = activeSection !== null;

    return (
        <div className="w-100 pb-4">
            <div
                className="card border shadow-sm bg-body"
                style={{
                    borderRadius: "20px",
                    minHeight: "fit-content"
                }}
            >
                <div className="card-body p-4 p-xl-5">
                    <div className="mb-4">
                        {!isEditing ? (
                            <>
                                <h4
                                    className="mb-2 fw-bold text-body"
                                    style={{ fontSize: "28px" }}
                                >
                                    Account settings
                                </h4>
                                <p
                                    className="mb-0 text-body-secondary"
                                    style={{ fontSize: "15px", maxWidth: "760px" }}
                                >
                                    Preview your account details and edit them by section.
                                </p>
                            </>
                        ) : (
                            <>
                                <div
                                    className="d-inline-flex align-items-center gap-2 mb-3 text-body"
                                    style={{
                                        padding: "6px 12px",
                                        borderRadius: "999px",
                                        fontSize: "12px",
                                        fontWeight: 700,
                                        background: "transparent",
                                        border: "none",
                                        boxShadow: "none"
                                    }}
                                >
                                    <i className={`bi ${activeSection === "contact" ? "bi-envelope-paper" : "bi-person-vcard"}`}></i>
                                    {activeSection === "contact" ? "Contact editor" : "Profile editor"}
                                </div>

                                <h4
                                    className="mb-2 fw-bold text-body"
                                    style={{
                                        fontSize: "28px",
                                        letterSpacing: "-0.02em"
                                    }}
                                >
                                    {activeSection === "contact"
                                        ? "Update your contact details"
                                        : "Edit your personal information"}
                                </h4>

                                <p
                                    className="mb-0 text-body-secondary"
                                    style={{ fontSize: "15px", maxWidth: "760px", lineHeight: 1.65 }}
                                >
                                    {activeSection === "contact"
                                        ? "Keep your email and phone information updated so your account details stay accurate."
                                        : "Refine your personal details and profile photo with a cleaner, more polished editing experience."}
                                </p>
                            </>
                        )}
                    </div>

                    {pageError && profile ? (
                        <AlertMessage>{pageError}</AlertMessage>
                    ) : null}

                    {!isEditing ? (
                        <>
                            <div
                                className="card border shadow-sm bg-body-tertiary mb-4"
                                style={{ borderRadius: "16px" }}
                            >
                                <div className="card-body px-4 py-3 px-xl-4 py-xl-3">
                                    <div className="row g-4 align-items-center">
                                        <div className="col-12 col-xl-5">
                                            <div className="d-flex align-items-center gap-3" style={{ minWidth: 0 }}>
                                                <Avatar
                                                    src={previewUrl}
                                                    name={displayName}
                                                    size={74}
                                                />

                                                <div style={{ minWidth: 0 }}>
                                                    <h5
                                                        className="mb-2 fw-bold text-body"
                                                        style={{
                                                            fontSize: "30px",
                                                            lineHeight: 1.15
                                                        }}
                                                    >
                                                        {displayName}
                                                    </h5>

                                                    <div
                                                        className="d-flex align-items-center flex-wrap gap-2 text-body-secondary"
                                                        style={{ fontSize: "15px", fontWeight: 500 }}
                                                    >
                                                        <span className="fw-bold text-info-emphasis">
                                                            {role}
                                                        </span>
                                                        <span className="text-body-secondary">|</span>
                                                        <span>{departmentName}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-auto d-none d-xl-flex justify-content-center">
                                            <div className="vr opacity-25" style={{ minHeight: "118px" }}></div>
                                        </div>

                                        <div className="col-12 col-xl">
                                            <div className="row g-4">
                                                <div className="col-6">
                                                    <InfoItem label="Role" value={role} />
                                                </div>
                                                <div className="col-6">
                                                    <InfoItem label="Employee ID" value={employeeId} />
                                                </div>
                                                <div className="col-6">
                                                    <InfoItem label="Department" value={departmentName} />
                                                </div>
                                                <div className="col-6">
                                                    <InfoItem label="Department ID" value={departmentId} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="row g-3 align-items-stretch">
                                <div className="col-12 col-xl-7 col-xxl-6">
                                    <CardSection
                                        title="Personal information"
                                        onEdit={() => handleStartEdit("personal")}
                                    >
                                        <div className="row g-4">
                                            <div className="col-12 col-md-6">
                                                <InfoItem label="Full name" value={form.full_name} />
                                            </div>

                                            <div className="col-12 col-md-6">
                                                <InfoItem label="Nickname" value={form.nickname} />
                                            </div>

                                            <div className="col-12 col-md-6">
                                                <InfoItem label="Date of birth" value={form.date_of_birth} />
                                            </div>

                                            <div className="col-12 col-md-6">
                                                <InfoItem label="Gender" value={form.gender} />
                                            </div>

                                            <div className="col-12">
                                                <InfoItem label="Address" value={form.address} />
                                            </div>
                                        </div>
                                    </CardSection>
                                </div>

                                <div className="col-12 col-xl-5 col-xxl-6">
                                    <div className="d-grid gap-3 h-100">
                                        <CardSection
                                            title="Contact information"
                                            onEdit={() => handleStartEdit("contact")}
                                        >
                                            <div className="row g-4">
                                                <div className="col-12 col-md-6">
                                                    <InfoItem label="Contact number" value={form.contact} />
                                                </div>

                                                <div className="col-12 col-md-6">
                                                    <InfoItem label="Email" value={form.email} />
                                                </div>
                                            </div>
                                        </CardSection>

                                        <CardSection title="Account information">
                                            <div className="row g-4">
                                                <div className="col-12 col-md-6 col-xl-6">
                                                    <InfoItem label="Department" value={departmentName} />
                                                </div>

                                                <div className="col-12 col-md-6 col-xl-6">
                                                    <InfoItem label="Role" value={role} />
                                                </div>

                                                <div className="col-12 col-md-6 col-xl-6">
                                                    <InfoItem label="Employee ID" value={employeeId} />
                                                </div>

                                                <div className="col-12 col-md-6 col-xl-6">
                                                    <InfoItem label="Department ID" value={departmentId} />
                                                </div>
                                            </div>
                                        </CardSection>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                                <form onSubmit={handleSubmit}>
                                    <div
                                        className="border-0 bg-transparent shadow-none"
                                        style={{
                                            borderRadius: 0,
                                            background: "transparent",
                                            boxShadow: "none"
                                        }}
                                    >
                                        <div className="p-0">

                                    {activeSection === "personal" ? (
                                        <>
                                            <div
                                                className="p-3 p-md-4 mb-4"
                                                style={premiumPanelStyle}
                                            >
                                                <div className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between gap-4">
                                                    <div className="d-flex align-items-center gap-3">
                                                        <Avatar
                                                            src={previewUrl}
                                                            name={displayName}
                                                            size={94}
                                                        />

                                                        <div>
                                                            <div
                                                                className="fw-bold text-body"
                                                                style={{ fontSize: "20px", lineHeight: 1.15 }}
                                                            >
                                                                {displayName}
                                                            </div>
                                                            <div
                                                                className="text-body-secondary mt-1"
                                                                style={{ fontSize: "14px" }}
                                                            >
                                                                Upload a polished profile image for a more professional account view.
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="d-flex flex-column flex-sm-row gap-2 flex-wrap">
                                                        <input
                                                            ref={fileInputRef}
                                                            type="file"
                                                            accept="image/png,image/jpeg,image/webp"
                                                            className="d-none"
                                                            onChange={handleImageChange}
                                                        />

                                                        <button
                                                            type="button"
                                                            className="btn btn-dark fw-semibold d-inline-flex align-items-center gap-2"
                                                            style={softIconButtonStyle}
                                                            onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                                        >
                                                            <i className="bi bi-cloud-arrow-up"></i>
                                                            Upload image
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-danger d-inline-flex align-items-center gap-2"
                                                            style={softIconButtonStyle}
                                                            onClick={handleRemoveImage}
                                                        >
                                                            <i className="bi bi-trash3-fill"></i>
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                className="p-3 p-md-4"
                                                style={premiumPanelStyle}
                                            >
                                                <div className="row g-4">
                                                    <div className="col-12 col-md-6">
                                                        <label className="form-label text-body" style={labelStyle}>
                                                            Full name <span className="text-danger">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            name="full_name"
                                                            value={form.full_name}
                                                            onChange={handleChange}
                                                            required
                                                            style={fieldStyle}
                                                        />
                                                    </div>

                                                    <div className="col-12 col-md-6">
                                                        <label className="form-label text-body" style={labelStyle}>
                                                            Nickname
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            name="nickname"
                                                            value={form.nickname}
                                                            onChange={handleChange}
                                                            placeholder="Enter nickname"
                                                            style={fieldStyle}
                                                        />
                                                    </div>

                                                    <div className="col-12 col-md-5 col-lg-4">
                                                        <label className="form-label text-body d-flex align-items-center gap-2" style={labelStyle}>
                                                            <i className="bi bi-calendar3 text-body-secondary"></i>
                                                            Date of birth
                                                        </label>
                                                        <input
                                                            type="date"
                                                            className="form-control"
                                                            name="date_of_birth"
                                                            value={form.date_of_birth}
                                                            onChange={handleChange}
                                                            style={compactDateStyle}
                                                        />
                                                    </div>

                                                    <div className="col-12 col-md-7 col-lg-4">
                                                        <label className="form-label text-body d-flex align-items-center gap-2" style={labelStyle}>
                                                            <i className="bi bi-person-badge text-body-secondary"></i>
                                                            Gender
                                                        </label>
                                                        <select
                                                            className="form-select"
                                                            name="gender"
                                                            value={form.gender}
                                                            onChange={handleChange}
                                                            style={fieldStyle}
                                                        >
                                                            <option value="">Select gender</option>
                                                            <option value="Male">Male</option>
                                                            <option value="Female">Female</option>
                                                            <option value="Rather not say">Rather not say</option>
                                                        </select>
                                                    </div>

                                                    <div className="col-12">
                                                        <label className="form-label text-body" style={labelStyle}>
                                                            Address
                                                        </label>
                                                        <textarea
                                                            className="form-control"
                                                            name="address"
                                                            rows="4"
                                                            value={form.address}
                                                            onChange={handleChange}
                                                            placeholder="Enter address"
                                                            style={textareaStyle}
                                                        ></textarea>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div
                                            className="p-3 p-md-4"
                                            style={premiumPanelStyle}
                                        >
                                            <div className="row g-4">
                                                <div className="col-12 col-lg-6">
                                                    <label className="form-label text-body d-flex align-items-center gap-2" style={labelStyle}>
                                                        <i className="bi bi-envelope text-body-secondary"></i>
                                                        Email <span className="text-danger">*</span>
                                                    </label>
                                                    <input
                                                        type="email"
                                                        className="form-control"
                                                        name="email"
                                                        value={form.email}
                                                        onChange={handleChange}
                                                        required
                                                        style={fieldStyle}
                                                    />
                                                </div>

                                                <div className="col-12 col-lg-6">
                                                    <label className="form-label text-body d-flex align-items-center gap-2" style={labelStyle}>
                                                        <i className="bi bi-telephone text-body-secondary"></i>
                                                        Contact number
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        name="contact"
                                                        value={form.contact}
                                                        onChange={handleChange}
                                                        placeholder="Enter contact number"
                                                        style={fieldStyle}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="d-flex flex-column-reverse flex-sm-row justify-content-end align-items-stretch align-items-sm-center gap-2 mt-4 pt-2">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary fw-semibold"
                                            style={secondaryButtonStyle}
                                            onClick={handleCancelEdit}
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="submit"
                                            className="btn btn-dark fw-bold"
                                            style={primaryButtonStyle}
                                            disabled={saving}
                                        >
                                            {saving ? "Saving..." : "Save changes"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

const profileRoot = document.getElementById("root");
if (profileRoot) {
    createRoot(profileRoot).render(<ProfilePage />);
}