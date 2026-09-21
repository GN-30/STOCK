import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    TrendingUp,
    User,
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    Zap
} from "lucide-react";

import { signUp, signInAsGuest, resendVerificationEmail } from "../services/authService";

import "../styles/auth.css";


function Signup() {

    const navigate = useNavigate();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [guestLoading, setGuestLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showResend, setShowResend] = useState(false);
    const [resending, setResending] = useState(false);

    const handleGuestLogin = async () => {
        setError("");
        setSuccess("");
        try {
            setGuestLoading(true);
            await signInAsGuest();
            setSuccess("Launching StockFlow in Demo Mode...");
            setTimeout(() => {
                navigate("/dashboard");
            }, 400);
        } catch (err) {
            setError("Failed to launch guest mode: " + err.message);
        } finally {
            setGuestLoading(false);
        }
    };


    // ==========================================
    // SIGNUP
    // ==========================================

    const handleSignup = async (event) => {

        event.preventDefault();

        setError("");
        setSuccess("");


        if (!fullName.trim()) {

            setError(
                "Please enter your full name."
            );

            return;
        }


        if (!email.trim()) {

            setError(
                "Please enter your email address."
            );

            return;
        }


        if (password.length < 6) {

            setError(
                "Password must contain at least 6 characters."
            );

            return;
        }


        if (password !== confirmPassword) {

            setError(
                "Passwords do not match."
            );

            return;
        }


        try {

            setLoading(true);


            const data = await signUp(
                email.trim(),
                password,
                fullName.trim()
            );


            if (data.session) {

                setSuccess(
                    "Account created successfully."
                );


                setTimeout(() => {

                    navigate("/dashboard");

                }, 700);

            } else {

                setSuccess(
                    `Account created! A verification link has been sent to ${email.trim()}. Please check your Inbox and Spam/Junk folder to verify.`
                );
                setShowResend(true);

            }


        } catch (err) {

            console.error(err);

            setError(
                err.message ||
                "Unable to create your account."
            );

        } finally {

            setLoading(false);

        }
    };

    const handleResend = async () => {
        if (!email.trim()) {
            setError("Please enter your email address to resend.");
            return;
        }
        try {
            setResending(true);
            setError("");
            await resendVerificationEmail(email.trim());
            setSuccess(`Verification email resent to ${email.trim()}! Please check your Inbox and Spam/Junk folder.`);
        } catch (err) {
            setError(err.message || "Failed to resend verification email.");
        } finally {
            setResending(false);
        }
    };


    return (

        <div className="auth-page">


            {/* =====================================
                LEFT BRAND PANEL
            ===================================== */}

            <div className="auth-brand-panel">

                <div className="auth-brand">

                    <div className="auth-brand-icon">

                        <TrendingUp
                            size={28}
                        />

                    </div>

                    <div>

                        <h1>
                            StockFlow
                        </h1>

                        <p>
                            Market Tracker
                        </p>

                    </div>

                </div>


                <div className="auth-brand-content">

                    <p className="auth-eyebrow">
                        START YOUR MARKET JOURNEY
                    </p>

                    <h2>
                        Your watchlist.
                        <br />
                        Your market.
                    </h2>

                    <p>
                        Create your StockFlow account
                        and keep your favourite stocks
                        close at hand.
                    </p>

                </div>


                <div className="auth-brand-footer">

                    <span className="auth-status-dot"></span>

                    NSE / BSE Market Tracker

                </div>

            </div>


            {/* =====================================
                SIGNUP FORM
            ===================================== */}

            <div className="auth-form-panel">

                <div className="auth-form-wrapper">


                    {/* MOBILE BRAND */}

                    <div className="auth-mobile-brand">

                        <div className="auth-brand-icon">

                            <TrendingUp
                                size={24}
                            />

                        </div>

                        <div>

                            <strong>
                                StockFlow
                            </strong>

                            <span>
                                Market Tracker
                            </span>

                        </div>

                    </div>


                    {/* =================================
                        HEADING
                    ================================= */}

                    <div className="auth-heading">

                        <p>
                            GET STARTED
                        </p>

                        <h2>
                            Create your account
                        </h2>

                        <span>
                            Start building your personal market dashboard.
                        </span>

                    </div>


                    {/* =================================
                        ERROR
                    ================================= */}

                    {error && (

                        <div className="auth-message error">

                            {error}

                        </div>

                    )}


                    {/* =================================
                        SUCCESS
                    ================================= */}

                    {success && (

                        <div className="auth-message success">

                            {success}

                            {showResend && (
                                <div style={{ marginTop: "12px" }}>
                                    <button
                                        type="button"
                                        onClick={handleResend}
                                        disabled={resending}
                                        style={{
                                            background: "rgba(16, 185, 129, 0.2)",
                                            border: "1px solid rgba(16, 185, 129, 0.5)",
                                            color: "#10b981",
                                            padding: "6px 14px",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            fontSize: "0.82rem",
                                            fontWeight: 600
                                        }}
                                    >
                                        {resending ? "Resending..." : "Didn't receive email? Resend"}
                                    </button>
                                </div>
                            )}

                        </div>

                    )}


                    {/* =================================
                        FORM
                    ================================= */}

                    <form
                        className="auth-form"
                        onSubmit={handleSignup}
                    >


                        {/* FULL NAME */}

                        <div className="auth-field">

                            <label>
                                Full name
                            </label>

                            <div className="auth-input-wrapper">

                                <User
                                    size={18}
                                />

                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(event) =>
                                        setFullName(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Your name"
                                    autoComplete="name"
                                />

                            </div>

                        </div>


                        {/* EMAIL */}

                        <div className="auth-field">

                            <label>
                                Email address
                            </label>

                            <div className="auth-input-wrapper">

                                <Mail
                                    size={18}
                                />

                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(
                                            event.target.value
                                        )
                                    }
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                />

                            </div>

                        </div>


                        {/* PASSWORD */}

                        <div className="auth-field">

                            <label>
                                Password
                            </label>

                            <div className="auth-input-wrapper">

                                <Lock
                                    size={18}
                                />

                                <input
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(
                                            event.target.value
                                        )
                                    }
                                    placeholder="At least 6 characters"
                                    autoComplete="new-password"
                                />

                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() =>
                                        setShowPassword(
                                            !showPassword
                                        )
                                    }
                                >

                                    {showPassword ? (

                                        <EyeOff
                                            size={18}
                                        />

                                    ) : (

                                        <Eye
                                            size={18}
                                        />

                                    )}

                                </button>

                            </div>

                        </div>


                        {/* CONFIRM PASSWORD */}

                        <div className="auth-field">

                            <label>
                                Confirm password
                            </label>

                            <div className="auth-input-wrapper">

                                <Lock
                                    size={18}
                                />

                                <input
                                    type={
                                        showConfirmPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={confirmPassword}
                                    onChange={(event) =>
                                        setConfirmPassword(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Confirm your password"
                                    autoComplete="new-password"
                                />

                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() =>
                                        setShowConfirmPassword(
                                            !showConfirmPassword
                                        )
                                    }
                                >

                                    {showConfirmPassword ? (

                                        <EyeOff
                                            size={18}
                                        />

                                    ) : (

                                        <Eye
                                            size={18}
                                        />

                                    )}

                                </button>

                            </div>

                        </div>


                        {/* CREATE ACCOUNT */}

                        <button
                            type="submit"
                            className="auth-submit"
                            disabled={loading}
                        >

                            {loading
                                ? "Creating account..."
                                : "Create account"
                            }

                            {!loading && (

                                <ArrowRight
                                    size={18}
                                />

                            )}

                        </button>

                    </form>


                    {/* =================================
                        OR DIVIDER & GUEST ACCESS
                    ================================= */}

                    <div className="auth-divider">
                        <span>or</span>
                    </div>

                    <button
                        type="button"
                        className="auth-guest-btn"
                        onClick={handleGuestLogin}
                        disabled={loading || guestLoading}
                    >
                        <Zap size={17} />
                        {guestLoading ? "Starting Demo..." : "Continue as Guest (Demo Mode)"}
                    </button>


                    {/* =================================
                        LOGIN LINK
                    ================================= */}

                    <div className="auth-switch">

                        <span>
                            Already have an account?
                        </span>

                        <Link to="/login">
                            Sign in
                        </Link>

                    </div>


                </div>

            </div>

        </div>
    );
}


export default Signup;