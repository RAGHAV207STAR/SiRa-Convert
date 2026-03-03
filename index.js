        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
        import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut }
from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

        const firebaseConfig = {
            apiKey: "AIzaSyDPHV8YPr4_6wOBbUhgL_GKVeeEB_u3pnI",
            authDomain: "sira-452b7.firebaseapp.com",
            projectId: "sira-452b7",
            storageBucket: "sira-452b7.firebasestorage.app",
            messagingSenderId: "430519769070",
            appId: "1:430519769070:web:c9a3d4ccc962f6f46ee0ff"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        auth.useDeviceLanguage();
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        const AUTH_STORAGE_KEY = "sira-auth-user";
        const toastEl = document.getElementById("toast");
        const analytics = window.SiRaAnalytics || null;
        const loginPanel = document.getElementById("loginPanel");
        const googleLoginBtn = document.getElementById("googleLoginBtn");
        const googleLoginBtnText = document.getElementById("googleLoginBtnText");
        const loginStateText = document.getElementById("loginStateText");
        const logoutBtn = document.getElementById("logoutBtn");
        const profileBox = document.getElementById("profileBox");
        let authBusy = false;

        function showToast(message, type = "info") {
            if (!toastEl) {
                console.warn(message);
                return;
            }
            toastEl.textContent = message;
            toastEl.className = `toast ${type}`;
            toastEl.classList.add("show");
            clearTimeout(showToast.timer);
            showToast.timer = setTimeout(() => {
                toastEl.classList.remove("show");
            }, 2800);
        }

        function trackAnalytics(eventName, params) {
            if (!analytics || typeof analytics.trackEvent !== "function") return;
            analytics.trackEvent(eventName, params || {});
        }

        if (window.SiRaShared) {
            window.SiRaShared.initTheme();
        }


        // --- UI MENUS ---

        function setLoginPanelVisible(visible) {
            if (!loginPanel) return;
            loginPanel.classList.toggle("active", visible);
            loginPanel.setAttribute("aria-hidden", visible ? "false" : "true");
            document.body.classList.toggle("auth-modal-open", visible);
            if (!visible && loginStateText) loginStateText.textContent = "";
        }

        window.toggleLoginPanel = () => {
            const isOpen = Boolean(loginPanel && loginPanel.classList.contains("active"));
            setLoginPanelVisible(!isOpen);
        };

        function setGoogleLoginBusy(isBusy, hint) {
            if (!googleLoginBtn) return;
            googleLoginBtn.disabled = isBusy;
            googleLoginBtn.classList.toggle("is-loading", isBusy);
            if (googleLoginBtnText) {
                googleLoginBtnText.textContent = isBusy ? "Opening Google..." : "Continue with Google";
            }
            if (loginStateText) {
                loginStateText.textContent = hint || "";
            }
        }

        function setLogoutBusy(isBusy) {
            if (!logoutBtn) return;
            logoutBtn.disabled = isBusy;
            logoutBtn.classList.toggle("is-loading", isBusy);
            logoutBtn.textContent = isBusy ? "Signing out..." : "Logout";
        }

       // --- AUTH LOGIC ---
       window.loginWithGoogle = async () => {
    if (authBusy) return;
    authBusy = true;
    setGoogleLoginBusy(true, "Select your Google account to continue.");
    try {
        await signInWithPopup(auth, provider);
        setGoogleLoginBusy(false, "Signed in successfully.");
        trackAnalytics("auth_login_success", { auth_provider: "google" });
    } catch (error) {
        setGoogleLoginBusy(false, "");
        console.error('Google login failed:', error);
        trackAnalytics("auth_login_failed", {
            auth_provider: "google",
            error_code: String((error && error.code) || "unknown").slice(0, 60)
        });
        const code = (error && error.code) || "";
        if (code === "auth/unauthorized-domain") {
            if (loginStateText) loginStateText.textContent = "This domain is not enabled in Firebase Authentication.";
            showToast("Domain not authorized in Firebase Auth. Add it in Firebase Console.", "error");
            return;
        }
        if (code === "auth/popup-blocked") {
            if (loginStateText) loginStateText.textContent = "Popup blocked by browser settings.";
            showToast("Popup blocked. Allow popups and try again.", "warn");
            return;
        }
        if (code === "auth/popup-closed-by-user") {
            if (loginStateText) loginStateText.textContent = "Google sign-in was closed before completion.";
            showToast("Popup closed before sign-in completed. Please try again.", "warn");
            return;
        }
        if (loginStateText) loginStateText.textContent = "Sign-in failed. Retry with Google.";
        showToast("Login failed. Check popup permission and Firebase settings.", "error");
    } finally {
        authBusy = false;
    }
};
        window.handleLogout = async () => {
    if (authBusy) return;
    authBusy = true;
    setLogoutBusy(true);
    try {
        await signOut(auth);
        const menu = document.getElementById("userMenu");
        if (menu) menu.classList.remove("active");
        trackAnalytics("auth_logout_success");
        showToast("Logged out successfully.", "success");
    } catch (error) {
        console.error("Logout failed:", error);
        trackAnalytics("auth_logout_failed", {
            error_code: String((error && error.code) || "unknown").slice(0, 60)
        });
        showToast("Unable to log out right now. Please try again.", "error");
    } finally {
        setLogoutBusy(false);
        authBusy = false;
    }
};

        const closeLoginBtn = document.getElementById("closeLoginBtn");
        if (closeLoginBtn) closeLoginBtn.addEventListener("click", window.toggleLoginPanel);
        if (googleLoginBtn) googleLoginBtn.addEventListener("click", window.loginWithGoogle);
        if (logoutBtn) logoutBtn.addEventListener("click", window.handleLogout);
        if (loginPanel) {
            loginPanel.addEventListener("click", (event) => {
                if (event.target === loginPanel) setLoginPanelVisible(false);
            });
        }
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && loginPanel && loginPanel.classList.contains("active")) {
                setLoginPanelVisible(false);
            }
        });

function setGuestProfile() {
    const profileDisplay = document.getElementById("profileDisplay");
    if (profileDisplay) {
        profileDisplay.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
    }
    const userNameDisplay = document.getElementById("userNameDisplay");
    const userEmailDisplay = document.getElementById("userEmailDisplay");
    if (userNameDisplay) userNameDisplay.innerText = "Guest User";
    if (userEmailDisplay) userEmailDisplay.innerText = "Login to sync across tools";
    if (logoutBtn) logoutBtn.hidden = true;
    document.body.classList.remove("auth-signed-in");
    if (profileBox) profileBox.setAttribute("aria-label", "Sign in with Google");
}

function cacheUser(user) {
    try {
        if (!user) {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            return;
        }
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
            uid: user.uid || "",
            displayName: user.displayName || "",
            email: user.email || "",
            photoURL: user.photoURL || ""
        }));
    } catch (error) {
        // Ignore storage failures.
    }
}

function clearAuthQueryFlags() {
    const url = new URL(window.location.href);
    let changed = false;
    if (url.searchParams.has("login")) {
        url.searchParams.delete("login");
        changed = true;
    }
    if (url.searchParams.has("logout")) {
        url.searchParams.delete("logout");
        changed = true;
    }
    if (changed) {
        history.replaceState(null, "", url.pathname + (url.search ? url.search : "") + url.hash);
    }
}

function shouldOpenLoginFromQuery() {
    try {
        const url = new URL(window.location.href);
        return url.searchParams.get("login") === "1";
    } catch (error) {
        return false;
    }
}

function shouldLogoutFromQuery() {
    try {
        const url = new URL(window.location.href);
        return url.searchParams.get("logout") === "1";
    } catch (error) {
        return false;
    }
}

let handledAuthRouteQuery = false;

  onAuthStateChanged(auth, async (user) => {

    const profileDisplay = document.getElementById('profileDisplay');

    if (user) {
        if (profileDisplay) {
            profileDisplay.replaceChildren();
            const profileImage = document.createElement("img");
            profileImage.alt = user.displayName || "User profile";
            profileImage.style.width = "100%";
            profileImage.style.height = "100%";
            profileImage.style.objectFit = "cover";
            profileImage.referrerPolicy = "no-referrer";
            profileImage.src = user.photoURL || "logo.png";
            profileDisplay.appendChild(profileImage);
        }

        const userNameDisplay = document.getElementById("userNameDisplay");
        const userEmailDisplay = document.getElementById("userEmailDisplay");
        if (userNameDisplay) userNameDisplay.innerText = user.displayName || "Signed-in User";
        if (userEmailDisplay) userEmailDisplay.innerText = user.email || "";
        if (logoutBtn) logoutBtn.hidden = false;
        document.body.classList.add("auth-signed-in");
        if (profileBox) profileBox.setAttribute("aria-label", "Open account menu");

        cacheUser(user);
        setLoginPanelVisible(false);
    } else {
        cacheUser(null);
        setGuestProfile();
    }

    if (handledAuthRouteQuery) return;
    handledAuthRouteQuery = true;

    if (shouldLogoutFromQuery()) {
        if (user) {
            await window.handleLogout();
        }
        clearAuthQueryFlags();
        return;
    }

    if (!user && shouldOpenLoginFromQuery()) {
        setLoginPanelVisible(true);
        clearAuthQueryFlags();
    }
});


        if (window.SiRaShared) {
            window.SiRaShared.initUserMenu({
                onProfileRequest: () => {
                    if (!auth.currentUser) {
                        window.toggleLoginPanel();
                        return false;
                    }
                    return true;
                }
            });
        }

        // Splash
        window.addEventListener('load', () => setTimeout(() => {
            const splash = document.getElementById('splashScreen');
            if (!splash) return;
            splash.style.opacity = '0';
            setTimeout(() => splash.style.display = 'none', 500);
        }, 1200));

        if (window.SiRaShared) {
            window.SiRaShared.registerServiceWorker({
                onError: (error) => console.error('Service worker registration failed:', error)
            });
            window.SiRaShared.initInstallPrompt();
        }
