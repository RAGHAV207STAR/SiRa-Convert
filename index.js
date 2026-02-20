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
        const AUTH_STORAGE_KEY = "sira-auth-user";
        const toastEl = document.getElementById("toast");
        const analytics = window.SiRaAnalytics || null;

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

        window.toggleLoginPanel = () => {
    document.getElementById('loginPanel').classList.toggle('active');
};

       // --- AUTH LOGIC ---
       window.loginWithGoogle = async () => {
    try {
        await signInWithPopup(auth, provider);
        trackAnalytics("auth_login_success", { auth_provider: "google" });
    } catch (error) {
        console.error('Google login failed:', error);
        trackAnalytics("auth_login_failed", {
            auth_provider: "google",
            error_code: String((error && error.code) || "unknown").slice(0, 60)
        });
        const code = (error && error.code) || "";
        if (code === "auth/unauthorized-domain") {
            showToast("Domain not authorized in Firebase Auth. Add it in Firebase Console.", "error");
            return;
        }
        if (code === "auth/popup-blocked") {
            showToast("Popup blocked. Allow popups and try again.", "warn");
            return;
        }
        if (code === "auth/popup-closed-by-user") {
            showToast("Popup closed before sign-in completed. Please try again.", "warn");
            return;
        }
        showToast("Login failed. Check popup permission and Firebase settings.", "error");
    }
};
        window.handleLogout = async () => {
    try {
        await signOut(auth);
        trackAnalytics("auth_logout_success");
        showToast("Logged out successfully.", "success");
    } catch (error) {
        console.error("Logout failed:", error);
        trackAnalytics("auth_logout_failed", {
            error_code: String((error && error.code) || "unknown").slice(0, 60)
        });
        showToast("Unable to log out right now. Please try again.", "error");
    }
};

        const closeLoginBtn = document.getElementById("closeLoginBtn");
        const googleLoginBtn = document.getElementById("googleLoginBtn");
        const logoutBtn = document.getElementById("logoutBtn");
        if (closeLoginBtn) closeLoginBtn.addEventListener("click", window.toggleLoginPanel);
        if (googleLoginBtn) googleLoginBtn.addEventListener("click", window.loginWithGoogle);
        if (logoutBtn) logoutBtn.addEventListener("click", window.handleLogout);

function setGuestProfile() {
    const profileDisplay = document.getElementById("profileDisplay");
    if (profileDisplay) {
        profileDisplay.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
    }
    const userNameDisplay = document.getElementById("userNameDisplay");
    const userEmailDisplay = document.getElementById("userEmailDisplay");
    if (userNameDisplay) userNameDisplay.innerText = "Guest User";
    if (userEmailDisplay) userEmailDisplay.innerText = "";
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

        cacheUser(user);
        const loginPanel = document.getElementById("loginPanel");
        if (loginPanel) loginPanel.classList.remove("active");
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
        const loginPanel = document.getElementById("loginPanel");
        if (loginPanel) loginPanel.classList.add("active");
        clearAuthQueryFlags();
    }
});


        if (window.SiRaShared) {
            window.SiRaShared.initUserMenu({
                onProfileRequest: () => {
                    if (!auth.currentUser) {
                        toggleLoginPanel();
                        return false;
                    }
                    return true;
                }
            });
        }

        // Splash
        window.addEventListener('load', () => setTimeout(() => {
            const splash = document.getElementById('splashScreen');
            splash.style.opacity = '0';
            setTimeout(() => splash.style.display = 'none', 500);
        }, 1200));

        if (window.SiRaShared) {
            window.SiRaShared.registerServiceWorker({
                onError: (error) => console.error('Service worker registration failed:', error)
            });
            window.SiRaShared.initInstallPrompt();
        }
