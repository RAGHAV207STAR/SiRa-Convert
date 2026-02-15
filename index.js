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
    } catch (error) {
        console.error('Google login failed:', error);
        alert('Login failed. Please allow popups and try again.');
    }
};
        window.handleLogout = () => signOut(auth).then(() => location.reload());

        const closeLoginBtn = document.getElementById("closeLoginBtn");
        const googleLoginBtn = document.getElementById("googleLoginBtn");
        const logoutBtn = document.getElementById("logoutBtn");
        if (closeLoginBtn) closeLoginBtn.addEventListener("click", window.toggleLoginPanel);
        if (googleLoginBtn) googleLoginBtn.addEventListener("click", window.loginWithGoogle);
        if (logoutBtn) logoutBtn.addEventListener("click", window.handleLogout);

  onAuthStateChanged(auth, (user) => {

    const profileDisplay = document.getElementById('profileDisplay');

    if (user) {
        profileDisplay.replaceChildren();
        const profileImage = document.createElement("img");
        profileImage.alt = user.displayName || "User profile";
        profileImage.style.width = "100%";
        profileImage.style.height = "100%";
        profileImage.style.objectFit = "cover";
        profileImage.referrerPolicy = "no-referrer";
        profileImage.src = user.photoURL || "logo.png";
        profileDisplay.appendChild(profileImage);

        document.getElementById('userNameDisplay').innerText = user.displayName;
        document.getElementById('userEmailDisplay').innerText = user.email;

        document.getElementById('loginPanel').classList.remove('active');
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
