


function Profile() {
    const [profile, setProfile] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        fetch('php/get_profile.php')
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setError(data.error);
                } else {
                    setProfile(data);
                }
                setLoading(false);
            })
            .catch(() => {
                setError('Failed to load profile');
                setLoading(false);
            });
    }, []);

    return (
        <div className="card p-4 mb-4" style={{ maxWidth: 500 }}>
            <h5 className="mb-3">My Profile</h5>
            {loading ? (
                <div className="text-warning">Loading...</div>
            ) : error ? (
                <div className="text-danger">{error}</div>
            ) : profile ? (
                <>
                    <div className="mb-2"><strong>Name:</strong> {profile.name}</div>
                    <div className="mb-2"><strong>Email:</strong> {profile.email}</div>
                    <div className="mb-2"><strong>Contact:</strong> {profile.contact}</div>
                    <div className="mb-2"><strong>Address:</strong> {profile.address}</div>
                    <div className="mb-2"><strong>Department ID:</strong> {profile.department_id}</div>
                    <div className="mb-2"><strong>Role:</strong> {profile.role}</div>
                </>
            ) : null}
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Profile />);
