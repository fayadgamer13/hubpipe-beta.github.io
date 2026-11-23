import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-analytics.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    deleteUser,
    updateProfile,
    setPersistence,
    browserLocalPersistence,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyB66qIHfSITp8FhmE_F5mvYlrZ2fetzLwk",
    authDomain: "hubpipe-84e1d.firebaseapp.com",
    projectId: "hubpipe-84e1d",
    storageBucket: "hubpipe-84e1d.firebasestorage.app",
    messagingSenderId: "216900174133",
    appId: "1:216900174133:web:a5dcc64db9d7cf676f0c7c",
    measurementId: "G-X6CMEXN4H0"
};

const GIPHY_API_KEY = "R7YEl6RpmQCxoZZvVEaO8pNR6vX4fQvq";
const TENOR_API_KEY = "R7YEl6RpmQCxoZZvVEaO8pNR6vX4fQvq";
const REPORT_EMAIL_TARGET = "wadifayad@gmail.com";
const DISCOVER_SYNC_ROOM = "observable-hubpipe-discover-v1";
const SOCIAL_SYNC_ROOM = "observable-hubpipe-social-v1";
const MAX_SAVED_ACCOUNTS = 10;

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.error("Persistence setup error:", err);
});

let drone = null;
let room = null;
let discoverDroneRoom = null;
let socialDroneRoom = null;
let pendingUser = null;
let pendingGroupIconDataUrl = null;
let pendingGroupBannerDataUrl = null;
let pendingEditServerIconDataUrl = null;
let pendingFriendCandidate = null;
let activeContextFriend = null;
let activeContextServer = null;
let activeContextMessage = null;
let activeProfileUsername = null;
let activeMediaStream = null;
let activeEmojiCategory = "Smileys";
let activeGifSource = "all";
let deferredPwaPrompt = null;
let customNotifAudioUrl = localStorage.getItem("hubpipe_custom_notif_audio") || null;

let replyTargetMessage = null;
let stagedAttachment = null;
let markNextAsSpoiler = false;
let reactionTargetMsgId = null;
let forwardTargetMsgId = null;

window.isSignUpMode = false;
window.currentModalTab = "group";
window.currentUser = null;
window.currentRoomId = null;

function normalizeHandle(raw) {
    return (raw || "").trim().replace(/^@/, "").toLowerCase();
}

function getAccountStorageKey(suffix) {
    const handle = normalizeHandle(window.currentUser?.name || window.currentUser?.uid || "guest");
    return `hubpipe_${handle}_${suffix}`;
}

window.activeRooms = [];
window.discoverableGroups = JSON.parse(localStorage.getItem("hubpipe_shared_discover_groups") || "[]");
window.friendsList = [];
window.incomingFriendRequests = [];
window.roomMessages = {};
window.groupChannels = JSON.parse(localStorage.getItem("hubpipe_group_channels") || "{}");
window.mutedServers = [];
window.notificationsEnabled = false;
window.savedAccounts = JSON.parse(localStorage.getItem("hubpipe_saved_accounts") || "[]");

const TRANSLATIONS = {
    en: {
        hub: "Hub",
        friends: "Friends",
        addFriend: "Add Friend +",
        discover: "Discover",
        joinOrCreate: "Join or Create +",
        settings: "Settings"
    },
    es: {
        hub: "Centro",
        friends: "Amigos",
        addFriend: "Añadir amigo +",
        discover: "Descubrir",
        joinOrCreate: "Unirse o crear +",
        settings: "Ajustes"
    },
    fr: {
        hub: "Accueil",
        friends: "Amis",
        addFriend: "Ajouter un ami +",
        discover: "Découvrir",
        joinOrCreate: "Rejoindre ou créer +",
        settings: "Paramètres"
    },
    de: {
        hub: "Hub",
        friends: "Freunde",
        addFriend: "Freund hinzufügen +",
        discover: "Entdecken",
        joinOrCreate: "Beitreten oder erstellen +",
        settings: "Einstellungen"
    },
    pt: {
        hub: "Hub",
        friends: "Amigos",
        addFriend: "Adicionar amigo +",
        discover: "Descobrir",
        joinOrCreate: "Entrar ou criar +",
        settings: "Configurações"
    },
    ja: {
        hub: "ハブ",
        friends: "フレンド",
        addFriend: "フレンド追加 +",
        discover: "見つける",
        joinOrCreate: "参加または作成 +",
        settings: "設定"
    },
    ar: {
        hub: "المركز",
        friends: "الأصدقاء",
        addFriend: "إضافة صديق +",
        discover: "استكشاف",
        joinOrCreate: "انضمام أو إنشاء +",
        settings: "الإعدادات"
    }
};

const EMOJI_CATEGORIES = {
    Smileys: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "🤯", "🤠", "🥳", "😎", "🤓", "🧐", "😕", "😟", "🙁", "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬"],
    Gestures: ["👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "✌️", "🤟", "🤘", "👌", "🤌", "🤏", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🤙", "💪", "🦾", "🖕", "✍️", "🙏", "🦶", "🦵", "👂", "🦻", "👃", "👏", "🙌", "👐", "🤲", "🤝", "🫶", "🫵", "🫱", "🫲", "🫳", "🫴"],
    Hearts: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "💌", "🔥", "✨", "🌟", "💫", "💥", "💢", "💯", "🎉", "🎊", "🎈", "🏆", "🥇", "👑", "💎"],
    Objects: ["💬", "💭", "🗨️", "🗯️", "📱", "📲", "💻", "🖥️", "🖨️", "⌨️", "🖱️", "🎮", "🕹️", "🎧", "🎤", "📷", "📸", "🎥", "📺", "📻", "🔔", "🔕", "📢", "📣", "📁", "📂", "📄", "📃", "📑", "📌", "📍", "🔑", "🔒", "🔓", "🛠️", "⚙️", "🧲", "💡", "🔦", "🔋", "🔌", "🎁", "🎀", "📦"],
    Nature: ["🌞", "🌝", "🌛", "🌜", "🌚", "🌕", "🌖", "🌗", "🌘", "🌑", "🌒", "🌓", "🌔", "☀️", "⭐", "🌟", "🌠", "☁️", "⛅", "⛈️", "🌤️", "🌦️", "🌧️", "🌨️", "🌩️", "🌪️", "🌈", "☔", "⚡", "❄️", "☃️", "🔥", "💧", "🌊", "🌸", "🌺", "🌻", "🌼", "🌷", "🌱", "🌲", "🌳", "🌴", "🌵", "🍀", "🍁", "🍂", "🍃", "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐢", "🐍", "🐙", "🐠", "🐬", "🐳", "🦈", "🦖"]
};

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥", "😮", "😢", "👏", "🎉", "💯", "👀"];

const GIF_SUGGESTIONS = [
    { title: "Hello Wave", query: "hello wave", source: "giphy", url: "https://media.giphy.com/media/hvRJCLFzcasrR4ia7z/giphy.gif" },
    { title: "Thumbs Up GG", query: "thumbs up", source: "giphy", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif" },
    { title: "Celebration Party", query: "celebration party", source: "tenor", url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif" },
    { title: "Laughing LOL", query: "laughing funny", source: "giphy", url: "https://media.giphy.com/media/3o6Zt4HU9uwXmXSAuI/giphy.gif" },
    { title: "Mind Blown WOW", query: "mind blown shock", source: "tenor", url: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif" },
    { title: "High Five Team", query: "high five", source: "giphy", url: "https://media.giphy.com/media/s78f2r6L66z71/giphy.gif" },
    { title: "Typing Code", query: "typing cat", source: "tenor", url: "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" },
    { title: "Rocket Boost", query: "rocket launch", source: "giphy", url: "https://media.giphy.com/media/3ohnEqJ1XOfvWaSk7e/giphy.gif" },
    { title: "Dance Groove", query: "dance party", source: "tenor", url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif" },
    { title: "Applause Clap", query: "applause clap", source: "giphy", url: "https://media.giphy.com/media/7gVN2R2PussmI/giphy.gif" },
    { title: "Heart Love", query: "love heart", source: "tenor", url: "https://media.giphy.com/media/26BRv0ThflsHCqDrG/giphy.gif" },
    { title: "Sad Cry", query: "sad cry", source: "giphy", url: "https://media.giphy.com/media/L95W4wv8nnb9K/giphy.gif" }
];

function escapeHTML(str) {
    const div = document.createElement("div");
    div.innerText = str ?? "";
    return div.innerHTML;
}

function getCanonicalDmRoomId(userA, userB) {
    const a = normalizeHandle(userA);
    const b = normalizeHandle(userB);
    return "observable-dm-" + [a, b].sort().join("--");
}

function enforceCompactSettingsButton() {
    const btn = document.getElementById("profile-settings-btn");
    if (!btn) return;
    btn.style.width = "32px";
    btn.style.height = "32px";
    btn.style.minWidth = "32px";
    btn.style.padding = "4px";
    const img = btn.querySelector("img");
    if (img) {
        img.style.width = "16px";
        img.style.height = "16px";
    }
}

// ================= CUSTOM DIALOGS =================
window.showCustomDialog = function(title, message) {
    const modal = document.getElementById("custom-dialog-modal");
    const titleEl = document.getElementById("custom-dialog-title");
    const msgEl = document.getElementById("custom-dialog-message");
    if (!modal || !titleEl || !msgEl) {
        alert(`${title}\n\n${message}`);
        return;
    }
    titleEl.innerText = title;
    msgEl.innerText = message;
    modal.style.display = "flex";
};

window.closeCustomDialog = function() {
    const modal = document.getElementById("custom-dialog-modal");
    if (modal) modal.style.display = "none";
};

// ================= STORAGE & ACCOUNT STATE =================
function saveAccountState() {
    if (!window.currentUser) return;
    localStorage.setItem(getAccountStorageKey("rooms"), JSON.stringify(window.activeRooms));
    localStorage.setItem(getAccountStorageKey("friends"), JSON.stringify(window.friendsList));
    localStorage.setItem(getAccountStorageKey("requests"), JSON.stringify(window.incomingFriendRequests));
    localStorage.setItem(getAccountStorageKey("messages"), JSON.stringify(window.roomMessages));
    localStorage.setItem(getAccountStorageKey("muted"), JSON.stringify(window.mutedServers));
    localStorage.setItem(getAccountStorageKey("profile"), JSON.stringify({
        uid: window.currentUser.uid,
        name: window.currentUser.name,
        tag: window.currentUser.tag,
        pfp: window.currentUser.pfp,
        bio: window.currentUser.bio || "",
        status: window.currentUser.status || "Online",
        nameStyle: window.currentUser.nameStyle || "normal",
        bannerColor: window.currentUser.bannerColor || "#ff6600",
        bannerUrl: window.currentUser.bannerUrl || "",
        memberSince: window.currentUser.memberSince || new Date().toLocaleDateString()
    }));
    localStorage.setItem("hubpipe_last_active_user", JSON.stringify({
        uid: window.currentUser.uid,
        name: window.currentUser.name,
        tag: window.currentUser.tag,
        pfp: window.currentUser.pfp
    }));
    localStorage.setItem("hubpipe_shared_discover_groups", JSON.stringify(window.discoverableGroups));
    localStorage.setItem("hubpipe_group_channels", JSON.stringify(window.groupChannels));
}

function loadAccountState(userObj) {
    const handle = normalizeHandle(userObj.name || userObj.uid);
    const savedProfileRaw = localStorage.getItem(`hubpipe_${handle}_profile`);
    let savedProfile = null;
    if (savedProfileRaw) {
        try { savedProfile = JSON.parse(savedProfileRaw); } catch (e) {}
    }

    window.currentUser = {
        ...userObj,
        uid: savedProfile?.uid || userObj.uid || `user_${handle}`,
        name: savedProfile?.name || userObj.name,
        tag: savedProfile?.tag || userObj.tag || "#1000",
        pfp: savedProfile?.pfp || userObj.pfp,
        bio: savedProfile?.bio || "Messaging on HubPipe.",
        status: savedProfile?.status || "Online",
        nameStyle: savedProfile?.nameStyle || "normal",
        bannerColor: savedProfile?.bannerColor || "#ff6600",
        bannerUrl: savedProfile?.bannerUrl || "",
        memberSince: savedProfile?.memberSince || new Date().toLocaleDateString()
    };

    window.activeRooms = JSON.parse(localStorage.getItem(getAccountStorageKey("rooms")) || "[]");
    window.friendsList = JSON.parse(localStorage.getItem(getAccountStorageKey("friends")) || "[]");
    window.incomingFriendRequests = JSON.parse(localStorage.getItem(getAccountStorageKey("requests")) || "[]");
    window.roomMessages = JSON.parse(localStorage.getItem(getAccountStorageKey("messages")) || "{}");
    window.mutedServers = JSON.parse(localStorage.getItem(getAccountStorageKey("muted")) || "[]");
    window.notificationsEnabled = localStorage.getItem(getAccountStorageKey("notifs")) === "true";

    const savedLang = localStorage.getItem(getAccountStorageKey("lang")) || "en";
    const langSelect = document.getElementById("app-language-select");
    if (langSelect) langSelect.value = savedLang;
    window.applyLanguageSelection(savedLang, false);

    const savedKeybindsRaw = localStorage.getItem(getAccountStorageKey("keybinds"));
    if (savedKeybindsRaw) {
        try {
            const kb = JSON.parse(savedKeybindsRaw);
            if (kb.sidebar && document.getElementById("keybind-sidebar-input")) document.getElementById("keybind-sidebar-input").value = kb.sidebar;
            if (kb.settings && document.getElementById("keybind-settings-input")) document.getElementById("keybind-settings-input").value = kb.settings;
            if (kb.hub && document.getElementById("keybind-hub-input")) document.getElementById("keybind-hub-input").value = kb.hub;
            if (kb.discover && document.getElementById("keybind-discover-input")) document.getElementById("keybind-discover-input").value = kb.discover;
        } catch (e) {}
    }

    const savedThemeRaw = localStorage.getItem(getAccountStorageKey("theme"));
    if (savedThemeRaw) {
        try {
            const t = JSON.parse(savedThemeRaw);
            applyThemeColors(t.accent, t.sidebar, t.hubBg, t.mode || "dark");
        } catch (e) {}
    } else {
        applyThemeColors("#ff6600", "#000000", "#1c1c1c", "dark");
    }

    const savedWall = localStorage.getItem(getAccountStorageKey("wallpaper"));
    if (savedWall) {
        setHubWallpaper(savedWall);
    } else {
        const centerPane = document.querySelector(".center-pane");
        if (centerPane) centerPane.style.backgroundImage = "";
    }
}

// ================= STARTUP, SESSION PERSISTENCE & PWA =================
window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
});

window.installWebApp = async function() {
    const isFirefox = navigator.userAgent.toLowerCase().includes("firefox");
    if (isFirefox) {
        window.showCustomDialog(
            "Firefox Notice",
            "Firefox does not support downloading website as an app yet. Try Chrome, Edge, or Brave to install HubPipe as a web app."
        );
        return;
    }
    if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        await deferredPwaPrompt.userChoice;
        deferredPwaPrompt = null;
    } else {
        window.showCustomDialog(
            "Install HubPipe Web App",
            "Use your browser menu and select 'Install HubPipe' or 'Add to Home Screen'."
        );
    }
};

window.handleOpenInBrowser = function() {
    if (window.currentUser) {
        document.getElementById("landing-screen").classList.remove("active");
        document.getElementById("auth-screen").classList.remove("active");
        document.getElementById("chat-screen").classList.add("active");
        enforceCompactSettingsButton();
        window.openHubView();
        return;
    }

    const lastUserRaw = localStorage.getItem("hubpipe_last_active_user");
    if (lastUserRaw) {
        try {
            const lastUser = JSON.parse(lastUserRaw);
            if (lastUser?.name) {
                enterChatApp({
                    uid: lastUser.uid,
                    displayName: lastUser.name,
                    photoURL: lastUser.pfp,
                    email: ""
                }, lastUser.tag);
                return;
            }
        } catch (e) {}
    }

    window.openAuthScreen("login");
};

onAuthStateChanged(auth, (firebaseUser) => {
    const lastUserRaw = localStorage.getItem("hubpipe_last_active_user");
    if (firebaseUser && !window.currentUser && !lastUserRaw) {
        const displayName = firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split("@")[0] : "User");
        const pfp = firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`;
        loadAccountState({ uid: firebaseUser.uid, name: displayName, tag: "#1000", pfp });
        registerSavedAccount(window.currentUser);
        syncHeaderAndFooterProfile();
        window.renderHubState();
        initScaledrone(window.currentUser);
    }
});

window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById("landing-screen").classList.add("active");
    enforceCompactSettingsButton();

    const ua = navigator.userAgent;
    let os = "Windows";
    if (ua.includes("Mac")) os = "macOS";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("Linux")) os = "Linux";

    const titleEl = document.getElementById("os-detect-title");
    const btnEl = document.getElementById("os-download-btn");
    if (titleEl) titleEl.innerText = `Download HubPipe for your “${os}”`;
    if (btnEl) btnEl.innerText = `Downloads for [${os}]`;

    renderEmojiCategories();
    renderEmojiGrid();
    renderGifResults(GIF_SUGGESTIONS);
});

// ================= LANDING, DOWNLOADS & REPORT =================
window.showLandingTab = function(tabName) {
    document.querySelectorAll(".landing-content").forEach(el => el.classList.remove("active"));
    const target = document.getElementById("tab-" + tabName);
    if (target) target.classList.add("active");
};

window.scrollToOsGrid = function() {
    document.getElementById("os-grid-section").scrollIntoView({ behavior: "smooth" });
};

window.openReportForm = function(prefillTarget = "") {
    window.showLandingTab("report");
    if (document.getElementById("chat-screen").classList.contains("active")) {
        document.getElementById("chat-screen").classList.remove("active");
        document.getElementById("landing-screen").classList.add("active");
    }
    const formSection = document.getElementById("report-form-section");
    const targetInput = document.getElementById("report-target");
    if (prefillTarget && targetInput) {
        targetInput.value = prefillTarget;
    }
    formSection.style.display = "block";
    formSection.scrollIntoView({ behavior: "smooth" });
};

window.handleReportSubmit = function(event) {
    event.preventDefault();
    const issueType = document.getElementById("report-type")?.value || "bug";
    const target = document.getElementById("report-target")?.value.trim() || "N/A";
    const details = document.getElementById("report-details")?.value.trim() || "";

    const subject = encodeURIComponent(`[HubPipe ${issueType.toUpperCase()} Report] ${target}`);
    const body = encodeURIComponent(
        `Issue Type: ${issueType}\nTarget / Username / Link: ${target}\nReporter: ${window.currentUser?.name || "Guest"}\n\nDetails:\n${details}`
    );

    const mailtoLink = `mailto:${REPORT_EMAIL_TARGET}?subject=${subject}&body=${body}`;
    window.open(mailtoLink, "_blank");

    window.showCustomDialog(
        "Report Sent",
        `Your report has been prepared and sent to ${REPORT_EMAIL_TARGET}.`
    );

    event.target.reset();
    document.getElementById("report-form-section").style.display = "none";
};

window.openAuthScreen = function(mode) {
    document.getElementById("landing-screen").classList.remove("active");
    document.getElementById("chat-screen").classList.remove("active");
    document.getElementById("loading-screen").classList.remove("active");
    document.getElementById("auth-screen").classList.add("active");
    window.switchAuthMode(mode);
};

window.backToLanding = function() {
    document.getElementById("auth-screen").classList.remove("active");
    document.getElementById("chat-screen").classList.remove("active");
    document.getElementById("landing-screen").classList.add("active");
};

// ================= AUTHENTICATION FLOW =================
window.handleBottomAuthClick = function(targetMode) {
    const authForm = document.getElementById("auth-form");
    if (authForm.style.display === "none") {
        window.switchAuthMode(targetMode);
        return;
    }
    if ((targetMode === "login" && !window.isSignUpMode) || (targetMode === "signup" && window.isSignUpMode)) {
        authForm.requestSubmit();
    } else {
        window.switchAuthMode(targetMode);
    }
};

window.switchAuthMode = function(mode) {
    const authForm = document.getElementById("auth-form");
    const forgotForm = document.getElementById("forgot-form");
    const inboxNotice = document.getElementById("inbox-notice");
    const setupForm = document.getElementById("final-setup-form");
    const bottomBtns = document.getElementById("auth-bottom-buttons");
    const submitBtn = document.getElementById("main-auth-submit-btn");

    authForm.style.display = "none";
    forgotForm.style.display = "none";
    inboxNotice.style.display = "none";
    setupForm.style.display = "none";
    bottomBtns.style.display = (mode === "login" || mode === "signup") ? "flex" : "none";

    const btnLogin = document.getElementById("btn-bottom-login");
    const btnSignup = document.getElementById("btn-bottom-signup");

    if (mode === "login") {
        window.isSignUpMode = false;
        authForm.style.display = "block";
        submitBtn.style.display = "none";
        document.getElementById("auth-title").innerText = "Login";
        document.getElementById("email-label").innerText = "Email or Username";
        document.getElementById("verify-group").style.display = "none";
        document.getElementById("password-verify").required = false;
        document.getElementById("login-helpers").style.display = "block";
        btnLogin.className = "pill-btn-light-orange";
        btnSignup.className = "pill-btn-orange";
    } else if (mode === "signup") {
        window.isSignUpMode = true;
        authForm.style.display = "block";
        submitBtn.style.display = "block";
        submitBtn.innerText = "Create & Verify";
        document.getElementById("auth-title").innerText = "Sign Up";
        document.getElementById("email-label").innerText = "Email";
        document.getElementById("verify-group").style.display = "block";
        document.getElementById("password-verify").required = true;
        document.getElementById("login-helpers").style.display = "none";
        btnLogin.className = "pill-btn-orange";
        btnSignup.className = "pill-btn-light-orange";
    } else if (mode === "forgot") {
        document.getElementById("auth-title").innerText = "Forgot Password?";
        forgotForm.style.display = "block";
    } else if (mode === "inbox-reset") {
        document.getElementById("auth-title").innerText = "Check your inbox";
        document.getElementById("inbox-message").innerHTML = `You should see an mail to change your password<br>if you dont see it check your spam folder.`;
        const actionBtn = document.getElementById("inbox-action-btn");
        actionBtn.innerText = "OK, Open Mail";
        actionBtn.onclick = () => window.switchAuthMode("login");
        inboxNotice.style.display = "block";
    } else if (mode === "inbox-verify") {
        document.getElementById("auth-title").innerText = "Verify Your Email";
        document.getElementById("inbox-message").innerHTML = `
            We sent a verification link to your email.<br>
            Please click the link in your email inbox (or spam folder) first,<br>
            then click below to confirm verification.
        `;
        const actionBtn = document.getElementById("inbox-action-btn");
        actionBtn.innerText = "I Clicked the Email Link";
        actionBtn.onclick = () => window.verifyEmailAndProceedToSetup();
        inboxNotice.style.display = "block";
    } else if (mode === "setup") {
        document.getElementById("auth-title").innerText = "Final Setup";
        setupForm.style.display = "block";
    }
};

window.verifyEmailAndProceedToSetup = async function() {
    const user = pendingUser || auth.currentUser;
    if (!user) {
        window.showCustomDialog("Verification Required", "Please sign up and check your email verification link first.");
        return;
    }
    try {
        await user.reload();
        if (user.emailVerified) {
            window.switchAuthMode("setup");
        } else {
            window.showCustomDialog(
                "Email Not Verified Yet",
                "Please open your email inbox/spam folder and click the verification link before continuing to Final Setup."
            );
        }
    } catch (e) {
        window.showCustomDialog("Verification Check Failed", "Could not verify email status yet. Please click the link in your email and try again.");
    }
};

function formatAuthError(err) {
    const msg = err?.message || "";
    if (
        err?.code === "auth/invalid-credential" ||
        err?.code === "auth/user-not-found" ||
        err?.code === "auth/wrong-password" ||
        msg.includes("auth/invalid-credential")
    ) {
        return "Login Failed";
    }
    return msg || "Login Failed";
}

window.handleAuth = function(event) {
    event.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (window.isSignUpMode) {
        const verify = document.getElementById("password-verify").value;
        if (password !== verify) {
            window.showCustomDialog("Password Mismatch", "Passwords do not match!");
            return;
        }

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                pendingUser = userCredential.user;
                return sendEmailVerification(pendingUser).then(() => {
                    window.switchAuthMode("inbox-verify");
                });
            })
            .catch((err) => window.showCustomDialog("Sign Up Failed", formatAuthError(err)));
    } else {
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                if (!userCredential.user.displayName) {
                    pendingUser = userCredential.user;
                    window.switchAuthMode("setup");
                } else {
                    enterChatApp(userCredential.user);
                }
            })
            .catch((err) => window.showCustomDialog("Login Failed", formatAuthError(err)));
    }
};

window.handleGoogleSignIn = function() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then((result) => {
            if (!result.user.displayName) {
                pendingUser = result.user;
                window.switchAuthMode("setup");
            } else {
                enterChatApp(result.user);
            }
        })
        .catch((err) => window.showCustomDialog("Login Failed", formatAuthError(err)));
};

window.handleForgotPassword = function(event) {
    event.preventDefault();
    const email = document.getElementById("forgot-email").value.trim();
    sendPasswordResetEmail(auth, email)
        .then(() => {
            window.switchAuthMode("inbox-reset");
        })
        .catch((err) => window.showCustomDialog("Reset Failed", formatAuthError(err)));
};

window.completeFinalSetup = function(event) {
    event.preventDefault();
    const chosenUsername = document.getElementById("setup-username").value.trim().replace(/^@/, "");
    if (!chosenUsername) return;

    const user = pendingUser || auth.currentUser;
    if (!user) return;

    if (user.email && !user.emailVerified) {
        window.showCustomDialog("Verify Email First", "Please verify your email link before finishing setup.");
        return;
    }

    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(chosenUsername)}`;
    updateProfile(user, {
        displayName: chosenUsername,
        photoURL: avatarUrl
    }).then(() => {
        pendingUser = null;
        enterChatApp(user);
    }).catch((err) => window.showCustomDialog("Setup Error", formatAuthError(err)));
};

// ================= LOADING & APP INITIALIZATION =================
function enterChatApp(user, existingTag = null) {
    const randomTag = existingTag || ("#" + Math.floor(1000 + Math.random() * 9000));
    const displayName = user.displayName || (user.email ? user.email.split("@")[0] : "User");
    const pfp = user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`;

    loadAccountState({
        uid: user.uid,
        name: displayName,
        tag: randomTag,
        pfp
    });

    registerSavedAccount(window.currentUser);
    saveAccountState();

    document.getElementById("landing-screen").classList.remove("active");
    document.getElementById("auth-screen").classList.remove("active");
    document.getElementById("loading-screen").classList.add("active");

    enforceCompactSettingsButton();
    syncHeaderAndFooterProfile();
    window.renderHubState();
    window.renderSavedAccountsList();
    initScaledrone(window.currentUser);

    setTimeout(() => {
        document.getElementById("loading-screen").classList.remove("active");
        document.getElementById("chat-screen").classList.add("active");
        enforceCompactSettingsButton();
        window.openHubView();
    }, 700);
}

function syncOwnAvatarInPastMessages(newName, newPfp) {
    const targetHandle = normalizeHandle(newName);
    Object.keys(window.roomMessages).forEach(rId => {
        const list = window.roomMessages[rId] || [];
        list.forEach(msg => {
            if (normalizeHandle(msg.authorName) === targetHandle) {
                msg.authorPfp = newPfp;
            }
        });
    });
    if (window.currentRoomId) {
        renderSavedRoomHistory(window.currentRoomId);
    }
}

function syncHeaderAndFooterProfile() {
    if (!window.currentUser) return;
    const nameEl = document.getElementById("footer-username");
    const tagEl = document.getElementById("footer-tag");
    const pfpEl = document.getElementById("footer-pfp");

    if (nameEl) {
        nameEl.innerText = "@" + window.currentUser.name;
        nameEl.style.fontWeight = window.currentUser.nameStyle === "bold-accent" ? "800" : "700";
        nameEl.style.fontStyle = window.currentUser.nameStyle === "italic-subtle" ? "italic" : "normal";
        nameEl.style.color = window.currentUser.nameStyle === "bold-accent" ? "var(--primary)" : "";
    }
    if (tagEl) {
        tagEl.innerHTML = `${escapeHTML(window.currentUser.tag)} <span class="status-pill-tag">• ${escapeHTML(window.currentUser.status || "Online")}</span>`;
    }
    if (pfpEl) pfpEl.src = window.currentUser.pfp;

    const profName = document.getElementById("profile-username-input");
    const profPfp = document.getElementById("profile-pfp-preview");
    if (profName) profName.value = window.currentUser.name;
    if (profPfp) profPfp.src = window.currentUser.pfp;
    enforceCompactSettingsButton();
}

// ================= MULTI-ACCOUNT (UP TO 10 ACCOUNTS) =================
function registerSavedAccount(userObj) {
    if (!userObj?.name) return;
    const handle = normalizeHandle(userObj.name);
    const existingIdx = window.savedAccounts.findIndex(a => normalizeHandle(a.name) === handle);
    const entry = {
        uid: userObj.uid || `local_${handle}`,
        name: userObj.name,
        tag: userObj.tag || "#1000",
        pfp: userObj.pfp,
        status: userObj.status || "Online"
    };
    if (existingIdx !== -1) {
        window.savedAccounts[existingIdx] = entry;
    } else if (window.savedAccounts.length < MAX_SAVED_ACCOUNTS) {
        window.savedAccounts.push(entry);
    }
    localStorage.setItem("hubpipe_saved_accounts", JSON.stringify(window.savedAccounts));
    window.renderSavedAccountsList();
}

window.addSavedAccount = function() {
    if (window.savedAccounts.length >= MAX_SAVED_ACCOUNTS) {
        window.showCustomDialog("Account Limit Reached", `You can only save up to ${MAX_SAVED_ACCOUNTS} accounts.`);
        return;
    }
    const input = document.getElementById("new-account-username");
    let rawName = (input?.value || "").trim().replace(/^@/, "");
    if (!rawName) {
        rawName = `User${Math.floor(100 + Math.random() * 900)}`;
    }

    const handle = normalizeHandle(rawName);
    if (window.savedAccounts.some(a => normalizeHandle(a.name) === handle)) {
        window.showCustomDialog("Already Added", `@${rawName} is already in your saved accounts.`);
        return;
    }

    const newAcc = {
        uid: `local_${handle}`,
        name: rawName,
        tag: "#" + Math.floor(1000 + Math.random() * 9000),
        pfp: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(rawName)}`,
        status: "Online"
    };

    registerSavedAccount(newAcc);
    if (input) input.value = "";
    window.showCustomDialog("Account Added", `Added @${rawName} (${window.savedAccounts.length}/${MAX_SAVED_ACCOUNTS}). Click Switch to sign in.`);
};

window.switchToSavedAccount = function(accountName) {
    const found = window.savedAccounts.find(a => normalizeHandle(a.name) === normalizeHandle(accountName));
    if (!found) return;
    if (window.currentUser) saveAccountState();
    loadAccountState(found);
    syncHeaderAndFooterProfile();
    window.renderHubState();
    window.renderSavedAccountsList();
    window.openHubView();
    initScaledrone(window.currentUser);
    window.showCustomDialog("Switched Account", `Now signed in as @${found.name}.`);
};

window.renderSavedAccountsList = function() {
    const listEl = document.getElementById("saved-accounts-list");
    const countEl = document.getElementById("saved-accounts-count");
    if (countEl) countEl.innerText = String(window.savedAccounts.length);
    if (!listEl) return;

    listEl.innerHTML = "";
    window.savedAccounts.forEach(acc => {
        const isCurrent = window.currentUser && normalizeHandle(window.currentUser.name) === normalizeHandle(acc.name);
        const row = document.createElement("div");
        row.className = "saved-account-row";
        row.innerHTML = `
            <span>@${escapeHTML(acc.name)} ${escapeHTML(acc.tag)} ${isCurrent ? "(Active)" : ""}</span>
            ${isCurrent ? "" : `<button type="button" class="secondary-btn" style="padding:4px 10px; font-size:12px;" onclick="switchToSavedAccount('${escapeHTML(acc.name)}')">Switch</button>`}
        `;
        listEl.appendChild(row);
    });
};

// ================= SCALEDRONE & MESSAGE HISTORY ENGINE =================
function initScaledrone(userObj) {
    if (drone) {
        try { drone.close(); } catch (e) {}
    }

    drone = new Scaledrone("XIPWg3VjezdtvgAk", {
        data: {
            name: userObj.name,
            tag: userObj.tag,
            pfp: userObj.pfp,
            status: userObj.status || "Online",
            bio: userObj.bio || ""
        }
    });

    drone.on("open", error => {
        if (error) {
            console.error("Scaledrone error:", error);
            return;
        }

        discoverDroneRoom = drone.subscribe(DISCOVER_SYNC_ROOM);
        discoverDroneRoom.on("data", (payload) => {
            if (payload?.type === "discover-group" && payload.group) {
                const exists = window.discoverableGroups.some(g => g.id === payload.group.id);
                if (!exists) {
                    window.discoverableGroups.unshift(payload.group);
                    localStorage.setItem("hubpipe_shared_discover_groups", JSON.stringify(window.discoverableGroups));
                    window.renderDiscoverCards();
                }
            }
        });

        socialDroneRoom = drone.subscribe(SOCIAL_SYNC_ROOM);
        socialDroneRoom.on("data", (payload) => {
            if (!payload || !window.currentUser) return;
            const myHandle = normalizeHandle(window.currentUser.name);

            if (payload.type === "friend-request" && normalizeHandle(payload.to) === myHandle) {
                const alreadyIncoming = window.incomingFriendRequests.some(r => normalizeHandle(r.name) === normalizeHandle(payload.from.name));
                const alreadyFriend = window.friendsList.some(f => normalizeHandle(f.name) === normalizeHandle(payload.from.name));
                if (!alreadyIncoming && !alreadyFriend) {
                    window.incomingFriendRequests.push(payload.from);
                    saveAccountState();
                    window.renderHubState();
                }
            } else if (payload.type === "friend-accepted" && normalizeHandle(payload.to) === myHandle) {
                const exists = window.friendsList.some(f => normalizeHandle(f.name) === normalizeHandle(payload.friend.name));
                if (!exists) {
                    window.friendsList.push(payload.friend);
                    saveAccountState();
                    window.renderHubState();
                }
            } else if (payload.type === "channels-update" && payload.roomId) {
                window.groupChannels[payload.roomId] = payload.channels || [];
                localStorage.setItem("hubpipe_group_channels", JSON.stringify(window.groupChannels));
                if (window.currentRoomId === payload.roomId) {
                    renderGroupChannelsStrip(payload.roomId, true);
                }
            } else if (payload.type === "server-update" && payload.group) {
                const idx = window.discoverableGroups.findIndex(g => g.id === payload.group.id);
                if (idx !== -1) {
                    window.discoverableGroups[idx] = { ...window.discoverableGroups[idx], ...payload.group };
                    localStorage.setItem("hubpipe_shared_discover_groups", JSON.stringify(window.discoverableGroups));
                    window.renderDiscoverCards();
                }
                const activeIdx = window.activeRooms.findIndex(r => r.id === payload.group.id);
                if (activeIdx !== -1) {
                    window.activeRooms[activeIdx] = { ...window.activeRooms[activeIdx], ...payload.group };
                    saveAccountState();
                    window.renderHubState();
                    if (window.currentRoomId === payload.group.id) {
                        window.switchRoom(payload.group.id);
                    }
                }
            }
        });
    });
}

function recordAndRenderMessage(targetRoomId, msgData, isOwnMessage = false) {
    const msgObj = {
        id: msgData.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        authorName: msgData.authorName,
        authorPfp: msgData.authorPfp,
        text: msgData.text || "",
        replyTo: msgData.replyTo || null,
        spoiler: Boolean(msgData.spoiler),
        gif: msgData.gif || null,
        imageData: msgData.imageData || null,
        fileName: msgData.fileName || null,
        fileMime: msgData.fileMime || "",
        fileUrl: msgData.fileUrl || null,
        codeText: msgData.codeText ?? null,
        fileSizeLabel: msgData.fileSizeLabel || null,
        pinned: Boolean(msgData.pinned),
        reactions: msgData.reactions || [],
        time: msgData.time
    };

    if (!window.roomMessages[targetRoomId]) {
        window.roomMessages[targetRoomId] = [];
    }
    window.roomMessages[targetRoomId].push(msgObj);

    const previewText = msgObj.spoiler
        ? "[Spoiler]"
        : (msgObj.text
            || (msgObj.gif ? "[GIF]" : null)
            || (msgObj.imageData ? `[Image: ${msgObj.fileName || "image"}]` : null)
            || (msgObj.fileName ? `[File: ${msgObj.fileName}]` : "[Media]"));

    const roomIndex = window.activeRooms.findIndex(r => r.id === targetRoomId);
    if (roomIndex !== -1) {
        const updatedRoom = window.activeRooms.splice(roomIndex, 1)[0];
        updatedRoom.desc = previewText;
        if (!isOwnMessage && targetRoomId !== window.currentRoomId) {
            updatedRoom.unreadCount = (updatedRoom.unreadCount || 0) + 1;
        }
        window.activeRooms.unshift(updatedRoom);
    } else if (!isOwnMessage && !targetRoomId.startsWith("observable-dm-")) {
        window.activeRooms.unshift({
            id: targetRoomId,
            name: targetRoomId.replace("observable-group-", ""),
            desc: previewText,
            type: "group",
            unreadCount: targetRoomId === window.currentRoomId ? 0 : 1
        });
    }

    saveAccountState();
    window.renderHubState();

    if (targetRoomId === window.currentRoomId) {
        appendMessageToLog(msgObj);
    }
}

function appendMessageToLog(msgData) {
    const messageContainer = document.getElementById("messages-log");
    if (!messageContainer) return;

    const msgRow = document.createElement("div");
    msgRow.className = "message-item-row" + (msgData.pinned ? " pinned-message" : "");
    msgRow.dataset.msgId = msgData.id;

    const spoilerClass = msgData.spoiler ? "spoiler-blur" : "";
    const spoilerClickAttr = msgData.spoiler ? ` onclick="this.classList.toggle('revealed')"` : "";

    const replyHTML = msgData.replyTo
        ? `<div class="message-reply-quote">↩ Replying to @${escapeHTML(msgData.replyTo.authorName)}: ${escapeHTML(msgData.replyTo.text)}</div>`
        : "";

    let attachmentHTML = "";
    if (msgData.gif) {
        attachmentHTML = `<img class="msg-gif ${spoilerClass}" src="${escapeHTML(msgData.gif)}" alt="GIF" onclick="if(!this.classList.contains('spoiler-blur')||this.classList.contains('revealed'))openFilePreviewById('${escapeHTML(msgData.id)}');else this.classList.add('revealed');">`;
    } else if (msgData.imageData) {
        attachmentHTML = `<img class="msg-image-attachment ${spoilerClass}" src="${escapeHTML(msgData.imageData)}" alt="${escapeHTML(msgData.fileName || "Uploaded image")}" onclick="if(!this.classList.contains('spoiler-blur')||this.classList.contains('revealed'))openFilePreviewById('${escapeHTML(msgData.id)}');else this.classList.add('revealed');">`;
    } else if (msgData.fileName) {
        attachmentHTML = `
            <div class="msg-file-card ${spoilerClass}" onclick="if(!this.classList.contains('spoiler-blur')||this.classList.contains('revealed'))openFilePreviewById('${escapeHTML(msgData.id)}');else this.classList.add('revealed');">
                <span>📄</span>
                <span>${escapeHTML(msgData.fileName)}${msgData.fileSizeLabel ? ` (${escapeHTML(msgData.fileSizeLabel)})` : ""}</span>
            </div>
        `;
    }

    const reactionsHTML = (msgData.reactions && msgData.reactions.length > 0)
        ? `<div class="msg-reactions-row">${msgData.reactions.map(r => `<button type="button" class="reaction-chip" onclick="toggleMessageReaction('${escapeHTML(msgData.id)}', '${escapeHTML(r)}')">${escapeHTML(r)}</button>`).join("")}</div>`
        : "";

    msgRow.innerHTML = `
        <img src="${escapeHTML(msgData.authorPfp)}" alt="Avatar" onclick="openUserProfileModal('${escapeHTML(msgData.authorName)}')">
        <div class="msg-content-block">
            <div class="msg-author-time">
                <span class="msg-name" onclick="openUserProfileModal('${escapeHTML(msgData.authorName)}')">@${escapeHTML(msgData.authorName)}</span>
                <span class="msg-timestamp">${escapeHTML(msgData.time)}</span>
                ${msgData.pinned ? '<span style="font-size:11px; color:var(--primary);">📌 Pinned</span>' : ""}
                ${msgData.spoiler ? '<span style="font-size:11px; color:var(--text-muted);">🙈 Spoiler</span>' : ""}
            </div>
            ${replyHTML}
            ${msgData.text ? `<div class="msg-text-body ${spoilerClass}"${spoilerClickAttr}>${escapeHTML(msgData.text)}</div>` : ""}
            ${attachmentHTML}
            ${reactionsHTML}
        </div>
    `;

    messageContainer.appendChild(msgRow);
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

function renderSavedRoomHistory(roomId) {
    const messageContainer = document.getElementById("messages-log");
    if (!messageContainer) return;
    messageContainer.innerHTML = "";
    const history = window.roomMessages[roomId] || [];
    history.forEach(msgData => appendMessageToLog(msgData));
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

function subscribeToRoom(roomId) {
    if (!drone) return;
    if (room) {
        try { room.unsubscribe(); } catch (e) {}
    }

    const subscribedRoomId = roomId;
    room = drone.subscribe(subscribedRoomId);

    room.on("members", members => {
        if (window.currentRoomId === subscribedRoomId) {
            renderMembersSidebar(members);
        }
    });

    room.on("data", (payload, member) => {
        const authorName = member?.clientData?.name || (typeof payload === "object" && payload.senderName) || "HubPipe";
        const authorPfp = member?.clientData?.pfp || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(authorName)}`;
        const isMe = window.currentUser && normalizeHandle(authorName) === normalizeHandle(window.currentUser.name);

        const textContent = typeof payload === "string" ? payload : (payload.text || "");
        const gifUrl = typeof payload === "object" ? (payload.gif || null) : null;
        const imageData = typeof payload === "object" ? (payload.imageData || null) : null;
        const fileName = typeof payload === "object" ? (payload.fileName || null) : null;
        const fileUrl = typeof payload === "object" ? (payload.fileUrl || imageData || gifUrl || null) : null;
        const fileSizeLabel = typeof payload === "object" ? (payload.fileSizeLabel || null) : null;
        const replyTo = typeof payload === "object" ? (payload.replyTo || null) : null;
        const spoiler = typeof payload === "object" ? Boolean(payload.spoiler) : false;
        const msgId = typeof payload === "object" && payload.id ? payload.id : null;
        const timeStr = (typeof payload === "object" && payload.time)
            ? payload.time
            : `${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ${new Date().toLocaleDateString()}`;

        const history = window.roomMessages[subscribedRoomId] || [];
        const alreadySaved = history.some(m =>
            (msgId && m.id === msgId) ||
            (isMe && m.text === textContent && m.gif === gifUrl && m.fileName === fileName && m.time === timeStr)
        );
        if (alreadySaved) return;

        recordAndRenderMessage(subscribedRoomId, {
            id: msgId || undefined,
            authorName,
            authorPfp,
            text: textContent,
            replyTo,
            spoiler,
            gif: gifUrl,
            imageData,
            fileName,
            fileUrl,
            fileSizeLabel,
            time: timeStr
        }, isMe);

        if (!isMe && !window.mutedServers.includes(subscribedRoomId)) {
            triggerIncomingNotification(authorName, textContent || fileName || "[Sent an attachment]");
        }
    });
}

// ================= MOBILE DRAWERS, HUB, FRIENDS & SIDEBARS =================
window.toggleMobileLeftSidebar = function() {
    const sb = document.getElementById("left-sidebar");
    const backdrop = document.getElementById("mobile-drawer-backdrop");
    sb.classList.toggle("mobile-open");
    backdrop.classList.toggle("active", sb.classList.contains("mobile-open"));
};

window.closeMobileDrawers = function() {
    document.getElementById("left-sidebar")?.classList.remove("mobile-open");
    document.getElementById("right-sidebar")?.classList.remove("mobile-open");
    document.getElementById("mobile-drawer-backdrop")?.classList.remove("active");
};

window.openHubView = function() {
    window.closeMobileDrawers();
    document.getElementById("active-chat-container").classList.remove("active");
    document.getElementById("discover-container").classList.remove("active");
    document.getElementById("hub-home-view").classList.add("active");
    document.getElementById("main-hub-top-bar").style.display = "flex";

    document.getElementById("right-sidebar-title").innerText = "List of Friends";
    document.getElementById("members-list").style.display = "none";
    document.getElementById("right-friends-list").style.display = window.friendsList.length > 0 ? "flex" : "none";
    document.getElementById("right-friends-empty").style.display = window.friendsList.length > 0 ? "none" : "flex";
};

window.toggleLeftSidebar = function() {
    const sb = document.getElementById("left-sidebar");
    const btn = sb.querySelector(".sidebar-collapse-tab");
    sb.classList.toggle("collapsed");
    btn.innerText = sb.classList.contains("collapsed") ? ">" : "<";
};

window.toggleRightSidebar = function() {
    const sb = document.getElementById("right-sidebar");
    if (window.innerWidth <= 820) {
        sb.classList.toggle("mobile-open");
        document.getElementById("mobile-drawer-backdrop")?.classList.toggle("active", sb.classList.contains("mobile-open"));
    } else {
        sb.style.display = sb.style.display === "none" ? "flex" : "none";
    }
};

function renderIncomingFriendRequests() {
    const box = document.getElementById("incoming-friend-requests-area");
    if (!box) return;
    if (!window.incomingFriendRequests || window.incomingFriendRequests.length === 0) {
        box.style.display = "none";
        box.innerHTML = "";
        return;
    }

    box.style.display = "flex";
    box.innerHTML = "";
    window.incomingFriendRequests.forEach((reqUser, idx) => {
        const card = document.createElement("div");
        card.className = "incoming-request-card";
        card.innerHTML = `
            <div><strong>@${escapeHTML(reqUser.name)}</strong> ${escapeHTML(reqUser.tag || "")} wants to be friends</div>
            <div class="incoming-request-actions">
                <button type="button" class="primary-btn" style="padding:6px 12px; font-size:12px;" onclick="decideIncomingFriendRequest(${idx}, true)">Accept</button>
                <button type="button" class="secondary-btn" style="padding:6px 12px; font-size:12px;" onclick="decideIncomingFriendRequest(${idx}, false)">Reject</button>
            </div>
        `;
        box.appendChild(card);
    });
}

window.decideIncomingFriendRequest = function(index, accepted) {
    const reqUser = window.incomingFriendRequests[index];
    if (!reqUser) return;
    window.incomingFriendRequests.splice(index, 1);

    if (accepted) {
        const exists = window.friendsList.some(f => normalizeHandle(f.name) === normalizeHandle(reqUser.name));
        if (!exists) {
            window.friendsList.push(reqUser);
        }

        const requesterHandle = normalizeHandle(reqUser.name);
        const theirFriendsKey = `hubpipe_${requesterHandle}_friends`;
        const theirFriends = JSON.parse(localStorage.getItem(theirFriendsKey) || "[]");
        const meAsFriend = {
            name: window.currentUser.name,
            tag: window.currentUser.tag,
            pfp: window.currentUser.pfp,
            status: window.currentUser.status || "Online",
            bio: window.currentUser.bio || "",
            memberSince: window.currentUser.memberSince || new Date().toLocaleDateString()
        };
        if (!theirFriends.some(f => normalizeHandle(f.name) === normalizeHandle(meAsFriend.name))) {
            theirFriends.push(meAsFriend);
            localStorage.setItem(theirFriendsKey, JSON.stringify(theirFriends));
        }

        if (socialDroneRoom && drone) {
            drone.publish({
                room: SOCIAL_SYNC_ROOM,
                message: {
                    type: "friend-accepted",
                    to: reqUser.name,
                    friend: meAsFriend
                }
            });
        }
    }

    saveAccountState();
    window.renderHubState();
};

window.renderHubState = function() {
    renderIncomingFriendRequests();

    const hasFriends = window.friendsList.length > 0;
    const groupChats = window.activeRooms.filter(r => r.type !== "dm");
    const hasGroups = groupChats.length > 0;

    document.getElementById("online-status-text").innerText = hasFriends
        ? `Online: ${window.friendsList.length}`
        : "Online: [NO FRIENDS]";
    document.getElementById("hub-pin-btn").style.display = (hasFriends || hasGroups || window.currentRoomId) ? "inline-flex" : "none";
    document.getElementById("hub-people-icon").style.display = (hasFriends || hasGroups) ? "inline-flex" : "none";

    const topFriendsSec = document.getElementById("top-friends-section");
    const topFriendsRow = document.getElementById("top-friends-row");
    topFriendsSec.style.display = hasFriends ? "block" : "none";
    topFriendsRow.innerHTML = "";

    window.friendsList.slice(0, 2).forEach((f) => {
        const dmId = getCanonicalDmRoomId(window.currentUser?.name || "me", f.name);
        const dmRoom = window.activeRooms.find(r => r.id === dmId);
        const unread = dmRoom?.unreadCount || 0;

        const chip = document.createElement("div");
        chip.className = "top-friend-chip";
        chip.dataset.username = f.name;
        chip.innerHTML = `
            <img src="${escapeHTML(f.pfp)}" alt="${escapeHTML(f.name)}">
            ${unread > 0 ? `<span class="notif-badge">${unread}</span>` : ""}
            <span>@${escapeHTML(f.nickname || f.name)}</span>
        `;
        chip.onclick = () => startDirectMessage(f);
        topFriendsRow.appendChild(chip);
    });

    const groupsEmpty = document.getElementById("sidebar-groups-empty");
    const roomsList = document.getElementById("rooms-list");
    groupsEmpty.style.display = hasGroups ? "none" : "flex";
    roomsList.innerHTML = "";

    groupChats.forEach(roomItem => {
        const card = document.createElement("div");
        card.className = "group-card-row";
        card.dataset.roomId = roomItem.id;
        if (roomItem.id === window.currentRoomId && document.getElementById("active-chat-container").classList.contains("active")) {
            card.classList.add("active");
        }
        card.innerHTML = `
            <img class="group-thumb" src="${escapeHTML(roomItem.icon || roomItem.banner || "Assets/Images/logo-orange.png")}" alt="Group">
            <div class="group-card-info">
                <div class="group-card-title">${escapeHTML(roomItem.name)}</div>
                <div class="group-card-desc">${escapeHTML(roomItem.desc)}</div>
            </div>
        `;
        card.onclick = () => window.switchRoom(roomItem.id);
        roomsList.appendChild(card);
    });

    const hubEmpty = document.getElementById("hub-friends-empty");
    const hubList = document.getElementById("hub-friends-list");
    const rightEmpty = document.getElementById("right-friends-empty");
    const rightList = document.getElementById("right-friends-list");

    hubEmpty.style.display = hasFriends ? "none" : "flex";
    if (document.getElementById("hub-home-view").classList.contains("active")) {
        rightEmpty.style.display = hasFriends ? "none" : "flex";
        rightList.style.display = hasFriends ? "flex" : "none";
    }
    hubList.innerHTML = "";
    rightList.innerHTML = "";

    window.friendsList.forEach(friend => {
        const label = friend.nickname ? `${friend.nickname} (@${friend.name})` : `@${friend.name} ${friend.tag}`;
        const rowHTML = `
            <img src="${escapeHTML(friend.pfp)}" alt="${escapeHTML(friend.name)}">
            <span>${escapeHTML(label)}</span>
        `;

        const centerRow = document.createElement("div");
        centerRow.className = "friend-list-row";
        centerRow.dataset.username = friend.name;
        centerRow.innerHTML = rowHTML;
        centerRow.onclick = () => startDirectMessage(friend);
        hubList.appendChild(centerRow);

        const rightRow = document.createElement("div");
        rightRow.className = "friend-list-row";
        rightRow.dataset.username = friend.name;
        rightRow.innerHTML = rowHTML;
        rightRow.onclick = () => startDirectMessage(friend);
        rightList.appendChild(rightRow);
    });
};

window.switchRoom = function(roomId) {
    window.closeMobileDrawers();
    window.currentRoomId = roomId;

    const targetRoom = window.activeRooms.find(r => r.id === roomId) || {
        id: roomId,
        name: roomId.replace("observable-group-", "").replace("observable-", ""),
        desc: "Hello this is a group chat Description!",
        icon: null,
        banner: null,
        type: "group"
    };
    targetRoom.unreadCount = 0;
    saveAccountState();
    window.renderHubState();

    document.getElementById("hub-home-view").classList.remove("active");
    document.getElementById("discover-container").classList.remove("active");
    document.getElementById("active-chat-container").classList.add("active");
    document.getElementById("main-hub-top-bar").style.display = "flex";

    document.getElementById("current-room-banner").src = targetRoom.icon || "Assets/Images/logo-orange.png";
    document.getElementById("current-room-title").innerText = targetRoom.name;
    document.getElementById("current-room-desc").innerText = targetRoom.desc;

    const bannerArea = document.getElementById("chat-banner-area");
    if (bannerArea) {
        bannerArea.style.backgroundImage = targetRoom.banner ? `url('${targetRoom.banner.replace(/'/g, "%27")}')` : "";
    }

    const isGroup = targetRoom.type !== "dm";
    document.getElementById("add-channel-btn").style.display = isGroup ? "inline-flex" : "none";
    document.getElementById("add-voice-btn").style.display = isGroup ? "inline-flex" : "none";
    document.getElementById("edit-server-btn").style.display = isGroup ? "inline-flex" : "none";
    renderGroupChannelsStrip(roomId, isGroup);

    window.cancelReply();
    window.clearStagedAttachment();
    renderSavedRoomHistory(roomId);

    document.getElementById("right-sidebar-title").innerText = isGroup ? "List of Chat Members" : "Direct Message";
    document.getElementById("right-friends-empty").style.display = "none";
    document.getElementById("right-friends-list").style.display = "none";
    document.getElementById("members-list").style.display = "flex";

    renderMembersSidebar([{ clientData: window.currentUser }]);
    subscribeToRoom(roomId);
};

function startDirectMessage(friend) {
    const dmId = getCanonicalDmRoomId(window.currentUser.name, friend.name);
    if (!window.activeRooms.some(r => r.id === dmId)) {
        window.activeRooms.unshift({
            id: dmId,
            name: `@${friend.name} ${friend.tag}`,
            desc: `Direct Message with @${friend.name}`,
            icon: friend.pfp,
            type: "dm",
            unreadCount: 0
        });
        saveAccountState();
    }
    window.switchRoom(dmId);
}

// ================= GROUP CHANNELS, SERVER EDITOR, CALLS & STREAMS =================
function renderGroupChannelsStrip(roomId, isGroup) {
    const strip = document.getElementById("group-channels-strip");
    if (!strip) return;
    if (!isGroup) {
        strip.style.display = "none";
        return;
    }
    if (!window.groupChannels[roomId]) {
        window.groupChannels[roomId] = [
            { id: "general", name: "# general", kind: "text" },
            { id: "voice-lobby", name: "🔊 General Voice", kind: "voice" }
        ];
    }
    strip.style.display = "flex";
    strip.innerHTML = "";
    window.groupChannels[roomId].forEach(ch => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "channel-pill";
        btn.innerText = ch.name;
        btn.onclick = () => {
            if (ch.kind === "voice") {
                window.startCallSession(ch.name);
            } else {
                window.showCustomDialog("Channel Switched", `Viewing ${ch.name}`);
            }
        };
        strip.appendChild(btn);
    });
}

function broadcastChannels(roomId) {
    localStorage.setItem("hubpipe_group_channels", JSON.stringify(window.groupChannels));
    if (socialDroneRoom && drone) {
        drone.publish({
            room: SOCIAL_SYNC_ROOM,
            message: {
                type: "channels-update",
                roomId,
                channels: window.groupChannels[roomId] || []
            }
        });
    }
}

window.addGroupChannel = function() {
    const roomId = window.currentRoomId;
    if (!roomId) return;
    const chName = prompt("Enter new text channel name:");
    if (!chName || !chName.trim()) return;
    if (!window.groupChannels[roomId]) window.groupChannels[roomId] = [];
    window.groupChannels[roomId].push({ id: `ch-${Date.now()}`, name: `# ${chName.trim().replace(/^#\s*/, "")}`, kind: "text" });
    broadcastChannels(roomId);
    renderGroupChannelsStrip(roomId, true);
};

window.addGroupVoiceChannel = function() {
    const roomId = window.currentRoomId;
    if (!roomId) return;
    const vName = prompt("Enter new voice channel name:");
    if (!vName || !vName.trim()) return;
    if (!window.groupChannels[roomId]) window.groupChannels[roomId] = [];
    window.groupChannels[roomId].push({ id: `vc-${Date.now()}`, name: `🔊 ${vName.trim().replace(/^🔊\s*/, "")}`, kind: "voice" });
    broadcastChannels(roomId);
    renderGroupChannelsStrip(roomId, true);
};

window.openServerEditorModal = function() {
    const roomId = window.currentRoomId;
    if (!roomId) return;
    const targetRoom = window.activeRooms.find(r => r.id === roomId);
    if (!targetRoom || targetRoom.type === "dm") return;

    pendingEditServerIconDataUrl = targetRoom.icon || null;
    document.getElementById("edit-server-name-input").value = targetRoom.name || "";
    document.getElementById("edit-server-desc-input").value = targetRoom.desc || "";
    document.getElementById("edit-server-icon-input").value = "";

    renderServerEditorChannels(roomId);
    document.getElementById("server-editor-modal").style.display = "flex";
};

window.closeServerEditorModal = function() {
    document.getElementById("server-editor-modal").style.display = "none";
    pendingEditServerIconDataUrl = null;
};

window.handleServerEditIconUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        pendingEditServerIconDataUrl = e.target.result;
    };
    reader.readAsDataURL(file);
};

function renderServerEditorChannels(roomId) {
    const list = document.getElementById("edit-server-channels-list");
    if (!list) return;
    const chans = window.groupChannels[roomId] || [];
    list.innerHTML = "";

    chans.forEach((ch, idx) => {
        const row = document.createElement("div");
        row.className = "channel-manage-row";
        row.innerHTML = `
            <span>${escapeHTML(ch.name)}</span>
            <div style="display:flex; gap:6px;">
                <button type="button" class="secondary-btn" style="padding:4px 8px; font-size:11px;" onclick="renameChannelInEditor('${escapeHTML(roomId)}', ${idx})">Rename</button>
                <button type="button" class="danger-btn" style="padding:4px 8px; font-size:11px;" onclick="deleteChannelInEditor('${escapeHTML(roomId)}', ${idx})">Delete</button>
            </div>
        `;
        list.appendChild(row);
    });
}

window.renameChannelInEditor = function(roomId, idx) {
    const chans = window.groupChannels[roomId] || [];
    if (!chans[idx]) return;
    const nextName = prompt("New channel name:", chans[idx].name);
    if (!nextName || !nextName.trim()) return;
    const prefix = chans[idx].kind === "voice" ? "🔊 " : "# ";
    const cleaned = nextName.trim().replace(/^(#|🔊)\s*/, "");
    chans[idx].name = `${prefix}${cleaned}`;
    broadcastChannels(roomId);
    renderServerEditorChannels(roomId);
    renderGroupChannelsStrip(roomId, true);
};

window.deleteChannelInEditor = function(roomId, idx) {
    const chans = window.groupChannels[roomId] || [];
    if (!chans[idx]) return;
    chans.splice(idx, 1);
    broadcastChannels(roomId);
    renderServerEditorChannels(roomId);
    renderGroupChannelsStrip(roomId, true);
};

window.saveServerEdits = function() {
    const roomId = window.currentRoomId;
    const targetRoom = window.activeRooms.find(r => r.id === roomId);
    if (!targetRoom) return;

    const newName = document.getElementById("edit-server-name-input").value.trim();
    const newDesc = document.getElementById("edit-server-desc-input").value.trim();

    if (newName) targetRoom.name = newName;
    if (newDesc) targetRoom.desc = newDesc;
    if (pendingEditServerIconDataUrl) targetRoom.icon = pendingEditServerIconDataUrl;

    const discIdx = window.discoverableGroups.findIndex(g => g.id === roomId);
    if (discIdx !== -1) {
        window.discoverableGroups[discIdx] = {
            ...window.discoverableGroups[discIdx],
            name: targetRoom.name,
            desc: targetRoom.desc,
            icon: targetRoom.icon
        };
    }

    if (socialDroneRoom && drone) {
        drone.publish({
            room: SOCIAL_SYNC_ROOM,
            message: {
                type: "server-update",
                group: {
                    id: targetRoom.id,
                    name: targetRoom.name,
                    desc: targetRoom.desc,
                    icon: targetRoom.icon
                }
            }
        });
    }

    saveAccountState();
    window.renderHubState();
    window.renderDiscoverCards();
    window.switchRoom(roomId);
    window.closeServerEditorModal();
    window.showCustomDialog("Settings applied!", "Server settings updated.");
};

window.startCallSession = async function(modeLabel) {
    window.endCallSession();
    const bar = document.getElementById("active-call-banner");
    const label = document.getElementById("active-call-label");
    const videoEl = document.getElementById("call-local-video");

    if (bar && label) {
        label.innerText = `${modeLabel} active`;
        bar.style.display = "flex";
    }

    try {
        if (modeLabel.toLowerCase().includes("screen") && navigator.mediaDevices?.getDisplayMedia) {
            activeMediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            if (videoEl) {
                videoEl.srcObject = activeMediaStream;
                videoEl.style.display = "block";
            }
        } else if (modeLabel.toLowerCase().includes("video") && navigator.mediaDevices?.getUserMedia) {
            activeMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (videoEl) {
                videoEl.srcObject = activeMediaStream;
                videoEl.style.display = "block";
            }
        } else if (navigator.mediaDevices?.getUserMedia) {
            activeMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (videoEl) videoEl.style.display = "none";
        }
    } catch (err) {
        if (label) {
            label.innerText = `${modeLabel} connected (preview mode)`;
        }
    }
};

window.endCallSession = function() {
    if (activeMediaStream) {
        activeMediaStream.getTracks().forEach(t => t.stop());
        activeMediaStream = null;
    }
    const videoEl = document.getElementById("call-local-video");
    if (videoEl) {
        videoEl.srcObject = null;
        videoEl.style.display = "none";
    }
    const bar = document.getElementById("active-call-banner");
    if (bar) bar.style.display = "none";
};

function renderMembersSidebar(members) {
    const list = document.getElementById("members-list");
    list.innerHTML = "";
    members.forEach((m, index) => {
        const name = m.clientData?.name || "Guest";
        const tag = m.clientData?.tag || "#0000";
        const pfp = m.clientData?.pfp || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;
        const row = document.createElement("div");
        row.className = "member-item-row";
        const crownHTML = index === 0
            ? `<img src="Assets/Images/Icons/crown.png" alt="Owner" class="member-crown-icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';"><span style="display:none;">👑</span>`
            : "";
        row.innerHTML = `
            <img src="${escapeHTML(pfp)}" alt="Avatar">
            <span>@${escapeHTML(name)} ${escapeHTML(tag)}${crownHTML}</span>
        `;
        row.onclick = () => window.openUserProfileModal(name);
        list.appendChild(row);
    });
}

window.handleHubSearch = function() {
    const query = document.getElementById("hub-search-input").value.toLowerCase();
    document.querySelectorAll("#hub-friends-list .friend-list-row").forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(query) ? "flex" : "none";
    });
    document.querySelectorAll("#messages-log .message-item-row").forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(query) ? "flex" : "none";
    });
};

// ================= DISCOVER GROUPS & JOINING =================
window.toggleDiscoverView = function() {
    window.closeMobileDrawers();
    const discoverPane = document.getElementById("discover-container");
    const showingDiscover = discoverPane.classList.contains("active");

    if (showingDiscover) {
        window.openHubView();
    } else {
        document.getElementById("hub-home-view").classList.remove("active");
        document.getElementById("active-chat-container").classList.remove("active");
        document.getElementById("main-hub-top-bar").style.display = "none";
        discoverPane.classList.add("active");
        window.renderDiscoverCards();
    }
};

window.joinGroupServer = function(group) {
    if (!group) return;
    if (!window.activeRooms.some(r => r.id === group.id)) {
        window.activeRooms.unshift({
            id: group.id,
            name: group.name,
            desc: group.desc,
            icon: group.icon || null,
            banner: group.banner || null,
            type: "group",
            unreadCount: 0
        });
        saveAccountState();
    }
    window.switchRoom(group.id);
};

window.renderDiscoverCards = function() {
    const searchInput = document.getElementById("discover-search");
    const query = searchInput ? searchInput.value.toLowerCase() : "";
    const grid = document.getElementById("discover-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const publicGroups = window.discoverableGroups.filter(
        g => g.visibility !== "private" && (g.name.toLowerCase().includes(query) || g.desc.toLowerCase().includes(query))
    );

    if (publicGroups.length === 0) {
        grid.style.display = "flex";
        grid.style.justifyContent = "center";
        grid.style.alignItems = "center";
        grid.style.minHeight = "240px";
        grid.innerHTML = `
            <div style="color: #888888; font-size: 15px; font-weight: 600; text-align: center;">
                No public group chats created yet. Click "Create Group +" to create one!
            </div>
        `;
        return;
    }

    grid.style.display = "grid";
    publicGroups.forEach(group => {
        const isJoined = window.activeRooms.some(r => r.id === group.id);
        const card = document.createElement("div");
        card.className = "discover-preview-card";
        card.innerHTML = `
            <img class="discover-card-thumb" src="${escapeHTML(group.icon || group.banner || "Assets/Images/logo-orange.png")}" alt="Group">
            <div class="discover-card-info">
                <div class="discover-card-name">${escapeHTML(group.name)}</div>
                <div class="discover-card-desc">${escapeHTML(group.desc)}</div>
            </div>
            <button type="button" class="primary-btn" style="padding:7px 14px; font-size:12px;">${isJoined ? "Open" : "Join"}</button>
        `;
        const joinBtn = card.querySelector("button");
        joinBtn.onclick = (e) => {
            e.stopPropagation();
            window.joinGroupServer(group);
        };
        card.onclick = () => window.joinGroupServer(group);
        grid.appendChild(card);
    });
};

// ================= REPLY, SPOILER, STAGED ATTACHMENTS & MESSAGING =================
window.setReplyTarget = function(msgObj) {
    if (!msgObj) return;
    replyTargetMessage = {
        id: msgObj.id,
        authorName: msgObj.authorName,
        text: msgObj.text || msgObj.fileName || (msgObj.gif ? "[GIF]" : "[Attachment]")
    };
    const bar = document.getElementById("reply-preview-bar");
    const label = document.getElementById("reply-preview-label");
    if (bar && label) {
        label.innerText = `Replying to @${replyTargetMessage.authorName}: ${replyTargetMessage.text}`;
        bar.style.display = "flex";
    }
    document.getElementById("message-input")?.focus();
};

window.cancelReply = function() {
    replyTargetMessage = null;
    const bar = document.getElementById("reply-preview-bar");
    if (bar) bar.style.display = "none";
};

window.clearStagedAttachment = function() {
    stagedAttachment = null;
    const bar = document.getElementById("staged-attachment-bar");
    if (bar) bar.style.display = "none";
};

window.toggleSpoilerOnComposer = function() {
    markNextAsSpoiler = !markNextAsSpoiler;
    const btn = document.getElementById("spoiler-toggle-btn");
    if (btn) {
        btn.style.borderColor = markNextAsSpoiler ? "var(--primary)" : "";
        btn.style.color = markNextAsSpoiler ? "var(--primary)" : "";
    }
};

function dispatchComposedPayload(targetRoom, extraFields = {}) {
    if (!targetRoom) return;
    const now = new Date();
    const timeStr = `${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ${now.toLocaleDateString()}`;
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const msgData = {
        id: msgId,
        authorName: window.currentUser?.name || "You",
        authorPfp: window.currentUser?.pfp || "https://api.dicebear.com/7.x/bottts/svg?seed=default",
        text: extraFields.text || "",
        replyTo: replyTargetMessage,
        spoiler: markNextAsSpoiler,
        gif: extraFields.gif || null,
        imageData: extraFields.imageData || null,
        fileName: extraFields.fileName || null,
        fileMime: extraFields.fileMime || "",
        fileUrl: extraFields.fileUrl || null,
        codeText: extraFields.codeText ?? null,
        fileSizeLabel: extraFields.fileSizeLabel || null,
        time: timeStr
    };

    recordAndRenderMessage(targetRoom, msgData, true);

    if (drone) {
        drone.publish({
            room: targetRoom,
            message: {
                id: msgId,
                senderName: window.currentUser?.name || "You",
                text: msgData.text || (msgData.fileName && !msgData.imageData ? `📎 ${msgData.fileName}${msgData.fileSizeLabel ? ` (${msgData.fileSizeLabel})` : ""}` : ""),
                replyTo: msgData.replyTo,
                spoiler: msgData.spoiler,
                gif: msgData.gif,
                imageData: msgData.imageData && msgData.imageData.length < 180000 ? msgData.imageData : null,
                fileName: msgData.fileName,
                fileSizeLabel: msgData.fileSizeLabel,
                time: timeStr
            }
        });
    }

    window.cancelReply();
    if (markNextAsSpoiler) {
        window.toggleSpoilerOnComposer();
    }
}

window.sendStagedAttachment = function() {
    if (!stagedAttachment || !window.currentRoomId) return;
    const caption = document.getElementById("message-input")?.value.trim() || "";
    dispatchComposedPayload(window.currentRoomId, {
        ...stagedAttachment,
        text: caption
    });
    if (document.getElementById("message-input")) {
        document.getElementById("message-input").value = "";
    }
    window.clearStagedAttachment();
};

window.sendMessage = function(event) {
    event.preventDefault();
    if (!window.currentRoomId) return;

    if (stagedAttachment) {
        window.sendStagedAttachment();
        return;
    }

    const input = document.getElementById("message-input");
    const text = input.value.trim();
    if (!text) return;

    dispatchComposedPayload(window.currentRoomId, { text });
    input.value = "";
};

window.togglePicker = function(type) {
    const picker = document.getElementById("media-picker");
    const emojiPanel = document.getElementById("emoji-picker-panel");
    const gifPanel = document.getElementById("gif-picker-panel");

    if (picker.style.display === "block" && picker.dataset.type === type) {
        picker.style.display = "none";
        return;
    }

    picker.style.display = "block";
    picker.dataset.type = type;

    if (type === "emoji") {
        emojiPanel.style.display = "block";
        gifPanel.style.display = "none";
        renderEmojiCategories();
        renderEmojiGrid();
    } else if (type === "gif") {
        emojiPanel.style.display = "none";
        gifPanel.style.display = "block";
        window.searchGifs();
    }
};

function renderEmojiCategories() {
    const tabsEl = document.getElementById("emoji-category-tabs");
    if (!tabsEl) return;
    tabsEl.innerHTML = "";

    Object.keys(EMOJI_CATEGORIES).forEach(catName => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "emoji-cat-btn" + (activeEmojiCategory === catName ? " active" : "");
        btn.innerText = catName;
        btn.onclick = () => {
            activeEmojiCategory = catName;
            renderEmojiCategories();
            renderEmojiGrid();
        };
        tabsEl.appendChild(btn);
    });
}

function renderEmojiGrid() {
    const gridEl = document.getElementById("emoji-picker-grid");
    if (!gridEl) return;
    gridEl.innerHTML = "";

    const list = EMOJI_CATEGORIES[activeEmojiCategory] || [];
    list.forEach(em => {
        const item = document.createElement("div");
        item.className = "picker-item";
        item.innerText = em;
        item.onclick = () => {
            const input = document.getElementById("message-input");
            input.value += em;
            input.focus();
        };
        gridEl.appendChild(item);
    });
}

window.setGifSource = function(source, btnEl) {
    activeGifSource = source;
    document.querySelectorAll(".gif-source-btn").forEach(b => b.classList.remove("active"));
    if (btnEl) btnEl.classList.add("active");
    window.searchGifs();
};

window.searchGifs = async function() {
    const query = (document.getElementById("gif-search-input")?.value || "").trim().toLowerCase();
    const apiResults = [];

    if (query) {
        if ((activeGifSource === "all" || activeGifSource === "giphy") && GIPHY_API_KEY) {
            try {
                const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(GIPHY_API_KEY)}&q=${encodeURIComponent(query)}&limit=12`);
                const data = await res.json();
                (data.data || []).forEach(g => {
                    const url = g.images?.fixed_height?.url || g.images?.downsized?.url;
                    if (url) apiResults.push({ title: g.title || query, source: "giphy", url });
                });
            } catch (e) {}
        }

        if ((activeGifSource === "all" || activeGifSource === "tenor") && TENOR_API_KEY) {
            try {
                const res = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${encodeURIComponent(TENOR_API_KEY)}&limit=12`);
                const data = await res.json();
                (data.results || []).forEach(item => {
                    const url = item.media_formats?.gif?.url || item.media_formats?.tinygif?.url;
                    if (url) apiResults.push({ title: item.content_description || query, source: "tenor", url });
                });
            } catch (e) {}
        }
    }

    const filteredSuggestions = GIF_SUGGESTIONS.filter(g => {
        const matchesSource = activeGifSource === "all" || g.source === activeGifSource;
        if (!matchesSource) return false;
        if (!query) return true;
        return g.title.toLowerCase().includes(query) || g.query.toLowerCase().includes(query);
    });

    const combined = apiResults.length > 0 ? [...apiResults, ...filteredSuggestions] : filteredSuggestions;
    renderGifResults(combined);
};

function renderGifResults(items) {
    const grid = document.getElementById("gif-picker-grid");
    if (!grid) return;
    grid.innerHTML = "";

    items.forEach(gifItem => {
        const card = document.createElement("div");
        card.className = "gif-card-option";
        card.innerHTML = `
            <img src="${escapeHTML(gifItem.url)}" alt="${escapeHTML(gifItem.title)}">
            <span class="gif-source-badge">${escapeHTML(gifItem.source)}</span>
        `;
        card.onclick = () => {
            const targetRoom = window.currentRoomId;
            if (!targetRoom) return;
            dispatchComposedPayload(targetRoom, {
                text: "",
                gif: gifItem.url,
                fileName: `${gifItem.title}.gif`,
                fileUrl: gifItem.url
            });
            document.getElementById("media-picker").style.display = "none";
        };
        grid.appendChild(card);
    });
}

function isCodeFile(fileName = "") {
    return /\.(js|ts|jsx|tsx|html|css|scss|json|py|java|c|cpp|h|cs|go|rs|php|rb|sh|sql|xml|yaml|yml|md|txt)$/i.test(fileName);
}

function isPdfFile(fileName = "", mimeType = "") {
    return mimeType === "application/pdf" || /\.pdf$/i.test(fileName);
}

window.handleFileAttachment = function(event) {
    const file = event.target.files[0];
    if (!file || !window.currentRoomId) return;

    const sizeLabel = file.size >= 1048576
        ? `${(file.size / 1048576).toFixed(2)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(file.name);
    const codeFile = !isImage && isCodeFile(file.name);

    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        const finalizeStage = (codeText = null) => {
            stagedAttachment = {
                imageData: isImage ? dataUrl : null,
                fileName: file.name,
                fileMime: file.type || "",
                fileUrl: dataUrl,
                codeText,
                fileSizeLabel: sizeLabel
            };
            const bar = document.getElementById("staged-attachment-bar");
            const nameEl = document.getElementById("staged-file-name");
            const thumbEl = document.getElementById("staged-file-thumb");
            if (bar && nameEl) {
                nameEl.innerText = `${file.name} (${sizeLabel})`;
                if (thumbEl) {
                    if (isImage) {
                        thumbEl.src = dataUrl;
                        thumbEl.style.display = "block";
                    } else {
                        thumbEl.style.display = "none";
                    }
                }
                bar.style.display = "flex";
            }
        };

        if (codeFile) {
            const textReader = new FileReader();
            textReader.onload = (ev) => finalizeStage(ev.target.result || "");
            textReader.readAsText(file);
        } else {
            finalizeStage(null);
        }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
};

window.openFilePreviewById = function(msgId) {
    const msgs = window.roomMessages[window.currentRoomId] || [];
    const item = msgs.find(m => m.id === msgId);
    if (!item) return;

    const modal = document.getElementById("file-preview-modal");
    const titleEl = document.getElementById("preview-modal-title");
    const bodyEl = document.getElementById("preview-modal-body");
    const actionsEl = document.getElementById("preview-modal-actions");
    if (!modal || !titleEl || !bodyEl || !actionsEl) return;

    const mediaSrc = item.imageData || item.gif || item.fileUrl;
    const name = item.fileName || (item.gif ? "Animated GIF" : "Attachment");
    titleEl.innerText = name;
    actionsEl.innerHTML = "";

    if (item.gif || item.imageData || /\.(png|jpe?g|gif|webp)$/i.test(name)) {
        bodyEl.innerHTML = `<img class="preview-media-full" src="${escapeHTML(mediaSrc)}" alt="${escapeHTML(name)}">`;
        if (mediaSrc) {
            const dlBtn = document.createElement("button");
            dlBtn.type = "button";
            dlBtn.className = "primary-btn";
            dlBtn.innerText = "Download";
            dlBtn.onclick = () => triggerDownloadUrl(mediaSrc, name);
            actionsEl.appendChild(dlBtn);
        }
    } else if (isPdfFile(name, item.fileMime)) {
        bodyEl.innerHTML = mediaSrc
            ? `<iframe src="${escapeHTML(mediaSrc)}" style="width:100%; height:340px; border:none; border-radius:8px;"></iframe>`
            : `<p style="padding:12px;">PDF File: ${escapeHTML(name)} (${escapeHTML(item.fileSizeLabel || "")})</p>`;
        if (mediaSrc) {
            const dlBtn = document.createElement("button");
            dlBtn.type = "button";
            dlBtn.className = "primary-btn";
            dlBtn.innerText = "Download PDF";
            dlBtn.onclick = () => triggerDownloadUrl(mediaSrc, name);
            actionsEl.appendChild(dlBtn);
        }
    } else if (item.codeText !== null && item.codeText !== undefined || isCodeFile(name)) {
        const codeContent = item.codeText ?? "";
        bodyEl.innerHTML = `<pre class="preview-code-block">${escapeHTML(codeContent)}</pre>`;

        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.className = "secondary-btn";
        copyBtn.innerText = "Copy";
        copyBtn.onclick = () => {
            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(codeContent).catch(() => {});
            }
            window.showCustomDialog("Copied", "Code copied to clipboard.");
        };

        const dlBtn = document.createElement("button");
        dlBtn.type = "button";
        dlBtn.className = "primary-btn";
        dlBtn.innerText = "Download";
        dlBtn.onclick = () => {
            const blobUrl = URL.createObjectURL(new Blob([codeContent], { type: "text/plain;charset=utf-8" }));
            triggerDownloadUrl(blobUrl, name);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        };

        actionsEl.appendChild(copyBtn);
        actionsEl.appendChild(dlBtn);
    } else {
        bodyEl.innerHTML = `<p style="padding:12px;">File: <strong>${escapeHTML(name)}</strong> ${item.fileSizeLabel ? `(${escapeHTML(item.fileSizeLabel)})` : ""}</p>`;
        if (mediaSrc) {
            const dlBtn = document.createElement("button");
            dlBtn.type = "button";
            dlBtn.className = "primary-btn";
            dlBtn.innerText = "Download";
            dlBtn.onclick = () => triggerDownloadUrl(mediaSrc, name);
            actionsEl.appendChild(dlBtn);
        }
    }

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "secondary-btn";
    closeBtn.innerText = "Close";
    closeBtn.onclick = window.closeFilePreviewModal;
    actionsEl.appendChild(closeBtn);

    modal.style.display = "flex";
};

window.closeFilePreviewModal = function() {
    document.getElementById("file-preview-modal").style.display = "none";
};

function triggerDownloadUrl(url, fileName) {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.toggleMessageReaction = function(msgId, reactionSymbol) {
    const msgs = window.roomMessages[window.currentRoomId] || [];
    const target = msgs.find(m => m.id === msgId);
    if (!target) return;
    target.reactions = target.reactions || [];
    const existingIdx = target.reactions.indexOf(reactionSymbol);
    if (existingIdx !== -1) {
        target.reactions.splice(existingIdx, 1);
    } else {
        target.reactions.push(reactionSymbol);
    }
    saveAccountState();
    renderSavedRoomHistory(window.currentRoomId);
};

window.openReactionModal = function(msgId) {
    reactionTargetMsgId = msgId;
    const modal = document.getElementById("reaction-modal");
    const row = document.getElementById("quick-reactions-row");
    const customInput = document.getElementById("custom-reaction-input");
    if (!modal || !row) return;

    if (customInput) customInput.value = "";
    row.innerHTML = "";
    QUICK_REACTIONS.forEach(em => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "picker-item";
        btn.innerText = em;
        btn.onclick = () => {
            if (reactionTargetMsgId) {
                window.toggleMessageReaction(reactionTargetMsgId, em);
            }
            window.closeReactionModal();
        };
        row.appendChild(btn);
    });

    modal.style.display = "flex";
};

window.closeReactionModal = function() {
    document.getElementById("reaction-modal").style.display = "none";
    reactionTargetMsgId = null;
};

window.applyCustomReaction = function() {
    const val = (document.getElementById("custom-reaction-input")?.value || "").trim();
    if (!val || !reactionTargetMsgId) return;
    window.toggleMessageReaction(reactionTargetMsgId, val);
    window.closeReactionModal();
};

window.openForwardModal = function(msgId) {
    forwardTargetMsgId = msgId;
    const modal = document.getElementById("forward-modal");
    const select = document.getElementById("forward-room-select");
    if (!modal || !select) return;

    select.innerHTML = "";
    window.activeRooms.forEach(r => {
        if (r.id === window.currentRoomId) return;
        const opt = document.createElement("option");
        opt.value = r.id;
        opt.innerText = r.name;
        select.appendChild(opt);
    });

    if (select.options.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.innerText = "No other chats available";
        select.appendChild(opt);
    }

    modal.style.display = "flex";
};

window.closeForwardModal = function() {
    document.getElementById("forward-modal").style.display = "none";
    forwardTargetMsgId = null;
};

window.confirmForwardMessage = function() {
    const destRoomId = document.getElementById("forward-room-select")?.value;
    if (!destRoomId || !forwardTargetMsgId) return;

    const msgs = window.roomMessages[window.currentRoomId] || [];
    const original = msgs.find(m => m.id === forwardTargetMsgId);
    if (!original) return;

    const now = new Date();
    const timeStr = `${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ${now.toLocaleDateString()}`;
    const fwdText = original.text ? `[Forwarded] ${original.text}` : "[Forwarded Attachment]";

    recordAndRenderMessage(destRoomId, {
        authorName: window.currentUser?.name || "You",
        authorPfp: window.currentUser?.pfp || "https://api.dicebear.com/7.x/bottts/svg?seed=default",
        text: fwdText,
        gif: original.gif,
        imageData: original.imageData,
        fileName: original.fileName,
        fileMime: original.fileMime,
        fileUrl: original.fileUrl,
        codeText: original.codeText,
        fileSizeLabel: original.fileSizeLabel,
        time: timeStr
    }, true);

    if (drone) {
        drone.publish({
            room: destRoomId,
            message: {
                senderName: window.currentUser?.name || "You",
                text: fwdText,
                gif: original.gif,
                time: timeStr
            }
        });
    }

    window.closeForwardModal();
    window.showCustomDialog("Forwarded", "Message forwarded to selected chat.");
};

// ================= PINNED MESSAGES MODAL =================
window.openPinnedMessagesModal = function() {
    const modal = document.getElementById("pinned-messages-modal");
    const listEl = document.getElementById("pinned-messages-list");
    if (!modal || !listEl) return;

    const msgs = window.roomMessages[window.currentRoomId] || [];
    const pinned = msgs.filter(m => m.pinned);

    if (pinned.length === 0) {
        listEl.innerHTML = `<div class="empty-state-center" style="min-height:140px;">Empty pin — no messages pinned in this chat yet.</div>`;
    } else {
        listEl.innerHTML = pinned.map(p => `
            <div class="pinned-item-card">
                <div style="font-weight:700; margin-bottom:4px;">@${escapeHTML(p.authorName)} • <span style="font-size:11px; color:var(--text-muted);">${escapeHTML(p.time)}</span></div>
                <div>${escapeHTML(p.text || p.fileName || (p.gif ? "[GIF]" : "[Attachment]"))}</div>
            </div>
        `).join("");
    }
    modal.style.display = "flex";
};

window.closePinnedMessagesModal = function() {
    document.getElementById("pinned-messages-modal").style.display = "none";
};

// ================= USER PROFILE & OWN PROFILE CUSTOMIZER =================
window.openUserProfileModal = function(username) {
    const cleanName = (username || "").replace(/^@/, "");
    if (!cleanName) return;
    if (window.currentUser && normalizeHandle(cleanName) === normalizeHandle(window.currentUser.name)) {
        window.openOwnProfileModal();
        return;
    }

    activeProfileUsername = cleanName;
    const friend = window.friendsList.find(f => normalizeHandle(f.name) === normalizeHandle(cleanName));
    const modal = document.getElementById("user-profile-modal");
    if (!modal) return;

    const bannerEl = document.getElementById("view-user-banner");
    const pfpEl = document.getElementById("view-user-pfp");
    const statusEl = document.getElementById("view-user-status-badge");
    const userEl = document.getElementById("view-user-username");
    const bioEl = document.getElementById("view-user-bio");
    const sinceEl = document.getElementById("view-user-since");
    const addBtn = document.getElementById("view-user-add-friend-btn");

    const pfp = friend?.pfp || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`;
    bannerEl.style.backgroundColor = friend?.bannerColor || "var(--primary)";
    bannerEl.style.backgroundImage = friend?.bannerUrl ? `url('${friend.bannerUrl.replace(/'/g, "%27")}')` : "";
    pfpEl.src = pfp;
    statusEl.innerText = friend?.status || "Online";
    userEl.innerText = `@${cleanName} ${friend?.tag || ""}`;
    bioEl.innerText = friend?.bio || "HubPipe member.";
    sinceEl.innerText = `Member since: ${friend?.memberSince || "Nov 2026"}`;
    if (addBtn) {
        addBtn.style.display = friend ? "none" : "inline-flex";
    }

    modal.style.display = "flex";
};

window.closeUserProfileModal = function() {
    document.getElementById("user-profile-modal").style.display = "none";
    activeProfileUsername = null;
};

window.addFriendFromProfile = function() {
    if (!activeProfileUsername) return;
    const candidate = {
        name: activeProfileUsername,
        tag: "#" + Math.floor(1000 + Math.random() * 9000),
        pfp: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(activeProfileUsername)}`,
        status: "Online",
        bio: "HubPipe friend",
        memberSince: new Date().toLocaleDateString()
    };
    window.closeUserProfileModal();
    sendFriendRequestToUser(candidate);
};

window.reportUserFromProfile = function() {
    const target = activeProfileUsername ? `@${activeProfileUsername}` : "";
    window.closeUserProfileModal();
    window.openReportForm(target);
};

window.openOwnProfileModal = function() {
    if (!window.currentUser) return;
    document.getElementById("own-status-select").value = window.currentUser.status || "Online";
    document.getElementById("own-profile-username").value = window.currentUser.name || "";
    document.getElementById("own-name-style").value = window.currentUser.nameStyle || "normal";
    document.getElementById("own-profile-bio").value = window.currentUser.bio || "";
    document.getElementById("own-banner-color").value = window.currentUser.bannerColor || "#ff6600";
    document.getElementById("own-banner-url").value = window.currentUser.bannerUrl || "";

    const prev = document.getElementById("own-banner-preview");
    prev.style.backgroundColor = window.currentUser.bannerColor || "#ff6600";
    prev.style.backgroundImage = window.currentUser.bannerUrl ? `url('${window.currentUser.bannerUrl.replace(/'/g, "%27")}')` : "";

    document.getElementById("own-profile-modal").style.display = "flex";
};

window.closeOwnProfileModal = function() {
    document.getElementById("own-profile-modal").style.display = "none";
};

window.handleOwnBannerFileUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const urlInput = document.getElementById("own-banner-url");
        urlInput.value = e.target.result;
        document.getElementById("own-banner-preview").style.backgroundImage = `url('${e.target.result.replace(/'/g, "%27")}')`;
    };
    reader.readAsDataURL(file);
    event.target.value = "";
};

window.saveOwnProfileCustomization = function() {
    if (!window.currentUser) return;
    const oldName = window.currentUser.name;
    const newName = (document.getElementById("own-profile-username").value || "").trim().replace(/^@/, "");
    if (newName && normalizeHandle(newName) !== normalizeHandle(oldName)) {
        const idx = window.savedAccounts.findIndex(a => normalizeHandle(a.name) === normalizeHandle(oldName));
        if (idx !== -1) {
            window.savedAccounts[idx].name = newName;
            localStorage.setItem("hubpipe_saved_accounts", JSON.stringify(window.savedAccounts));
        }
        window.currentUser.name = newName;
    }

    window.currentUser.status = document.getElementById("own-status-select").value;
    window.currentUser.nameStyle = document.getElementById("own-name-style").value;
    window.currentUser.bio = document.getElementById("own-profile-bio").value.trim();
    window.currentUser.bannerColor = document.getElementById("own-banner-color").value;
    window.currentUser.bannerUrl = document.getElementById("own-banner-url").value.trim();

    syncHeaderAndFooterProfile();
    syncOwnAvatarInPastMessages(window.currentUser.name, window.currentUser.pfp);
    registerSavedAccount(window.currentUser);
    saveAccountState();
    window.closeOwnProfileModal();
    window.showCustomDialog("Settings applied!", "Your profile customization has been saved.");
};

// ================= MODALS: GROUP, FRIEND REQUEST, SETTINGS =================
function sendFriendRequestToUser(candidate) {
    const targetHandle = normalizeHandle(candidate.name);
    const requesterPayload = {
        name: window.currentUser.name,
        tag: window.currentUser.tag,
        pfp: window.currentUser.pfp,
        status: window.currentUser.status || "Online",
        bio: window.currentUser.bio || "",
        memberSince: window.currentUser.memberSince || new Date().toLocaleDateString()
    };

    const targetReqKey = `hubpipe_${targetHandle}_requests`;
    const existingReqs = JSON.parse(localStorage.getItem(targetReqKey) || "[]");
    if (!existingReqs.some(r => normalizeHandle(r.name) === normalizeHandle(requesterPayload.name))) {
        existingReqs.push(requesterPayload);
        localStorage.setItem(targetReqKey, JSON.stringify(existingReqs));
    }

    if (socialDroneRoom && drone) {
        drone.publish({
            room: SOCIAL_SYNC_ROOM,
            message: {
                type: "friend-request",
                to: candidate.name,
                from: requesterPayload
            }
        });
    }

    if (normalizeHandle(window.currentUser.name) === targetHandle) {
        window.incomingFriendRequests = existingReqs;
        saveAccountState();
        window.renderHubState();
    } else {
        window.showCustomDialog("Friend Request Sent", `Friend request sent to @${candidate.name}. They can accept or reject it on their Hub.`);
    }
}

window.openCreateModal = function(tab) {
    document.getElementById("create-modal").style.display = "flex";
    window.switchModalTab(tab);
};

window.closeModal = function() {
    document.getElementById("create-modal").style.display = "none";
    document.getElementById("modal-input").value = "";
    document.getElementById("modal-desc-input").value = "";
    const iconInput = document.getElementById("group-banner-input");
    const bannerInput = document.getElementById("group-header-banner-input");
    if (iconInput) iconInput.value = "";
    if (bannerInput) bannerInput.value = "";
    pendingGroupIconDataUrl = null;
    pendingGroupBannerDataUrl = null;
};

window.switchModalTab = function(tab) {
    window.currentModalTab = tab;
    document.getElementById("modal-tab-group").classList.toggle("active", tab === "group");
    document.getElementById("modal-tab-dm").classList.toggle("active", tab === "dm");

    const descInput = document.getElementById("modal-desc-input");
    const bannerWrap = document.getElementById("group-banner-upload-wrap");

    if (tab === "dm") {
        document.getElementById("modal-heading").innerText = "Add Friend +";
        document.getElementById("modal-input").placeholder = "Enter friend username (e.g. Tommy456)";
        descInput.style.display = "none";
        if (bannerWrap) bannerWrap.style.display = "none";
    } else {
        document.getElementById("modal-heading").innerText = "Create Group +";
        document.getElementById("modal-input").placeholder = "Group Chat Name";
        descInput.style.display = "block";
        if (bannerWrap) bannerWrap.style.display = "block";
    }
};

window.handleGroupBannerUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) { pendingGroupIconDataUrl = e.target.result; };
    reader.readAsDataURL(file);
};

window.handleGroupHeaderBannerUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) { pendingGroupBannerDataUrl = e.target.result; };
    reader.readAsDataURL(file);
};

window.createNewChat = function() {
    const inputVal = document.getElementById("modal-input").value.trim().replace(/^@/, "");
    const descVal = document.getElementById("modal-desc-input").value.trim();
    const visibility = document.getElementById("group-visibility-select")?.value || "public";
    if (!inputVal) return;

    if (window.currentModalTab === "dm") {
        pendingFriendCandidate = {
            name: inputVal,
            tag: "#" + Math.floor(1000 + Math.random() * 9000),
            pfp: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(inputVal)}`,
            status: "Online",
            bio: "HubPipe friend",
            memberSince: new Date().toLocaleDateString()
        };
        window.closeModal();
        sendFriendRequestToUser(pendingFriendCandidate);
        pendingFriendCandidate = null;
        return;
    }

    const roomId = `observable-group-${inputVal.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    const newGroupObj = {
        id: roomId,
        name: inputVal,
        desc: descVal || "Hello this is a Group Chat Description!",
        icon: pendingGroupIconDataUrl || null,
        banner: pendingGroupBannerDataUrl || null,
        visibility,
        type: "group",
        unreadCount: 0
    };

    window.activeRooms.unshift(newGroupObj);
    if (visibility === "public") {
        window.discoverableGroups.unshift(newGroupObj);
        if (discoverDroneRoom && drone) {
            drone.publish({
                room: DISCOVER_SYNC_ROOM,
                message: { type: "discover-group", group: newGroupObj }
            });
        }
    }
    saveAccountState();

    window.closeModal();
    window.renderDiscoverCards();
    window.switchRoom(roomId);
};

window.respondToFriendRequestPrompt = function(accepted) {
    document.getElementById("friend-request-prompt-modal").style.display = "none";
    if (accepted && pendingFriendCandidate) {
        const exists = window.friendsList.some(f => normalizeHandle(f.name) === normalizeHandle(pendingFriendCandidate.name));
        if (!exists) {
            window.friendsList.push(pendingFriendCandidate);
            saveAccountState();
            window.renderHubState();
        }
    }
    pendingFriendCandidate = null;
};

window.openProfileModal = function() {
    document.getElementById("profile-modal").style.display = "flex";
};

window.closeProfileModal = function() {
    document.getElementById("profile-modal").style.display = "none";
};

window.switchSettingsCategory = function(categoryName, btnEl) {
    document.querySelectorAll(".settings-cat-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".settings-cat-panel").forEach(p => p.classList.remove("active"));
    if (btnEl) btnEl.classList.add("active");
    const targetPanel = document.getElementById("settings-cat-" + categoryName);
    if (targetPanel) targetPanel.classList.add("active");
};

window.handleCustomAvatarUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById("profile-pfp-preview").src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window.saveProfileChanges = function() {
    const newName = document.getElementById("profile-username-input").value.trim().replace(/^@/, "");
    const newPfp = document.getElementById("profile-pfp-preview").src;

    if (newName && window.currentUser) {
        const oldName = window.currentUser.name;
        if (normalizeHandle(newName) !== normalizeHandle(oldName)) {
            const idx = window.savedAccounts.findIndex(a => normalizeHandle(a.name) === normalizeHandle(oldName));
            if (idx !== -1) {
                window.savedAccounts[idx].name = newName;
                localStorage.setItem("hubpipe_saved_accounts", JSON.stringify(window.savedAccounts));
            }
        }
        window.currentUser.name = newName;
        window.currentUser.pfp = newPfp;
        syncHeaderAndFooterProfile();
        syncOwnAvatarInPastMessages(newName, newPfp);
        registerSavedAccount(window.currentUser);
        if (!newPfp.startsWith("data:") && auth.currentUser) {
            updateProfile(auth.currentUser, { displayName: newName, photoURL: newPfp }).catch(() => {});
        }
    }

    const kb = {
        sidebar: document.getElementById("keybind-sidebar-input")?.value || "Ctrl+B",
        settings: document.getElementById("keybind-settings-input")?.value || "Ctrl+,",
        hub: document.getElementById("keybind-hub-input")?.value || "Ctrl+H",
        discover: document.getElementById("keybind-discover-input")?.value || "Ctrl+D"
    };
    localStorage.setItem(getAccountStorageKey("keybinds"), JSON.stringify(kb));

    const lang = document.getElementById("app-language-select")?.value || "en";
    localStorage.setItem(getAccountStorageKey("lang"), lang);
    window.applyLanguageSelection(lang, false);

    const accent = document.getElementById("theme-accent-picker").value;
    const sidebar = document.getElementById("theme-sidebar-picker").value;
    const hubBg = document.getElementById("theme-bg-picker").value;
    const currentMode = document.documentElement.getAttribute("data-theme") || "dark";
    applyThemeColors(accent, sidebar, hubBg, currentMode);
    localStorage.setItem(getAccountStorageKey("theme"), JSON.stringify({ accent, sidebar, hubBg, mode: currentMode }));
    saveAccountState();

    window.closeProfileModal();
    window.showCustomDialog("Settings applied!", "Your settings have been saved.");
};

window.logOutApp = function() {
    if (window.currentUser) saveAccountState();
    localStorage.removeItem("hubpipe_last_active_user");
    signOut(auth).catch(() => {}).finally(() => {
        window.currentUser = null;
        window.activeRooms = [];
        window.friendsList = [];
        window.incomingFriendRequests = [];
        window.roomMessages = {};
        document.getElementById("chat-screen").classList.remove("active");
        document.getElementById("profile-modal").style.display = "none";
        window.openAuthScreen("login");
    });
};

window.deleteAccountApp = function() {
    if (confirm("Are you absolutely sure you want to delete your HubPipe Account? This cannot be undone.")) {
        if (auth.currentUser) {
            deleteUser(auth.currentUser).then(() => {
                localStorage.clear();
                window.showCustomDialog("Account Deleted", "Account completely deleted.");
                location.reload();
            }).catch(err => window.showCustomDialog("Error", "Please re-authenticate before deleting your account: " + err.message));
        }
    }
};

// ================= THEMES, LIGHT/DARK MODE, WALLPAPER, KEYBINDS, LANGUAGE & DND =================
function updateLightDarkButtonLabel(mode) {
    const btn = document.getElementById("light-dark-toggle-btn");
    if (!btn) return;
    btn.innerText = mode === "light" ? "🌙 Dark Mode" : "☀️ Light Mode";
}

window.toggleLightDarkMode = function() {
    const currentMode = document.documentElement.getAttribute("data-theme") || "dark";
    if (currentMode === "dark") {
        window.applyThemePreset("#ff6600", "#ffffff", "#f3f4f6", "light");
    } else {
        window.applyThemePreset("#ff6600", "#000000", "#1c1c1c", "dark");
    }
};

function applyThemeColors(accent, sidebar, hubBg, mode = "dark") {
    document.documentElement.setAttribute("data-theme", mode);
    updateLightDarkButtonLabel(mode);
    document.documentElement.style.setProperty("--primary", accent);
    document.documentElement.style.setProperty("--primary-hover", accent);
    document.documentElement.style.setProperty("--bg-sidebar", sidebar);
    document.documentElement.style.setProperty("--bg-hub", hubBg);

    const accentPicker = document.getElementById("theme-accent-picker");
    const sidebarPicker = document.getElementById("theme-sidebar-picker");
    const bgPicker = document.getElementById("theme-bg-picker");
    if (accentPicker && accent && accent.startsWith("#")) accentPicker.value = accent;
    if (sidebarPicker && sidebar && sidebar.startsWith("#")) sidebarPicker.value = sidebar;
    if (bgPicker && hubBg && hubBg.startsWith("#")) bgPicker.value = hubBg;
}

window.applyThemePreset = function(accent, sidebar, hubBg, mode = "dark") {
    applyThemeColors(accent, sidebar, hubBg, mode);
    localStorage.setItem(getAccountStorageKey("theme"), JSON.stringify({ accent, sidebar, hubBg, mode }));
};

window.applyGradientTheme = function(gradientCss, sidebar, hubBg) {
    document.documentElement.setAttribute("data-theme", "dark");
    updateLightDarkButtonLabel("dark");
    document.documentElement.style.setProperty("--primary", gradientCss);
    document.documentElement.style.setProperty("--primary-hover", gradientCss);
    document.documentElement.style.setProperty("--bg-sidebar", sidebar);
    document.documentElement.style.setProperty("--bg-hub", hubBg);
    localStorage.setItem(getAccountStorageKey("theme"), JSON.stringify({ accent: gradientCss, sidebar, hubBg, mode: "dark" }));
};

window.previewCustomTheme = function() {
    const accent = document.getElementById("theme-accent-picker").value;
    const sidebar = document.getElementById("theme-sidebar-picker").value;
    const hubBg = document.getElementById("theme-bg-picker").value;
    const isLight = parseInt(hubBg.replace("#", ""), 16) > 0x888888;
    applyThemeColors(accent, sidebar, hubBg, isLight ? "light" : "dark");
};

window.resetDefaultTheme = function() {
    window.applyThemePreset("#ff6600", "#000000", "#1c1c1c", "dark");
    localStorage.removeItem(getAccountStorageKey("wallpaper"));
    const centerPane = document.querySelector(".center-pane");
    if (centerPane) centerPane.style.backgroundImage = "";
    window.showCustomDialog("Settings applied!", "Theme and wallpaper reset to default.");
};

function setHubWallpaper(url) {
    const centerPane = document.querySelector(".center-pane");
    if (centerPane) {
        centerPane.style.backgroundImage = `url('${url.replace(/'/g, "%27")}')`;
        centerPane.style.backgroundSize = "cover";
        centerPane.style.backgroundPosition = "center";
    }
}

window.applyCustomWallpaper = function() {
    const url = document.getElementById("wallpaper-url-input").value.trim();
    if (!url) return;
    setHubWallpaper(url);
    localStorage.setItem(getAccountStorageKey("wallpaper"), url);
    window.showCustomDialog("Settings applied!", "Custom wallpaper applied!");
};

window.handleWallpaperUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        setHubWallpaper(dataUrl);
        try { localStorage.setItem(getAccountStorageKey("wallpaper"), dataUrl); } catch (err) {}
        window.showCustomDialog("Settings applied!", "Uploaded wallpaper applied!");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
};

window.applyLanguageSelection = function(langCode, showDialog = true) {
    const dict = TRANSLATIONS[langCode] || TRANSLATIONS.en;
    document.documentElement.lang = langCode;
    document.documentElement.dir = langCode === "ar" ? "rtl" : "ltr";

    const hubHeading = document.querySelector(".hub-main-heading");
    const friendsHeading = document.querySelector(".hub-sub-heading");
    const addFriendBtn = document.querySelector(".add-friend-wide-pill");
    const actionBtns = document.querySelectorAll(".get-started-row .green-action-btn");
    const settingsHeader = document.querySelector("#profile-modal .settings-modal-header h3");

    if (hubHeading) hubHeading.innerText = dict.hub;
    if (friendsHeading) friendsHeading.innerText = dict.friends;
    if (addFriendBtn) addFriendBtn.innerText = dict.addFriend;
    if (actionBtns[0]) actionBtns[0].innerText = dict.joinOrCreate;
    if (actionBtns[1]) actionBtns[1].innerText = dict.discover;
    if (settingsHeader) settingsHeader.innerText = dict.settings;

    if (window.currentUser) {
        localStorage.setItem(getAccountStorageKey("lang"), langCode);
    }
    if (showDialog) {
        window.showCustomDialog("Language Updated", `App language set to ${langCode.toUpperCase()}.`);
    }
};

function matchesKeybind(event, comboStr) {
    if (!comboStr) return false;
    const parts = comboStr.toLowerCase().split("+").map(s => s.trim());
    const needsCtrl = parts.includes("ctrl") || parts.includes("control");
    const needsShift = parts.includes("shift");
    const needsAlt = parts.includes("alt");
    const keyPart = parts.find(p => !["ctrl", "control", "shift", "alt"].includes(p));
    if (!keyPart) return false;
    return (
        (event.ctrlKey || event.metaKey) === needsCtrl &&
        event.shiftKey === needsShift &&
        event.altKey === needsAlt &&
        event.key.toLowerCase() === keyPart
    );
}

document.addEventListener("keydown", (e) => {
    if (!document.getElementById("chat-screen")?.classList.contains("active")) return;
    const sidebarBind = document.getElementById("keybind-sidebar-input")?.value || "Ctrl+B";
    const settingsBind = document.getElementById("keybind-settings-input")?.value || "Ctrl+,";
    const hubBind = document.getElementById("keybind-hub-input")?.value || "Ctrl+H";
    const discoverBind = document.getElementById("keybind-discover-input")?.value || "Ctrl+D";

    if (matchesKeybind(e, sidebarBind)) {
        e.preventDefault();
        window.toggleLeftSidebar();
    } else if (matchesKeybind(e, settingsBind)) {
        e.preventDefault();
        window.openProfileModal();
    } else if (matchesKeybind(e, hubBind)) {
        e.preventDefault();
        window.openHubView();
    } else if (matchesKeybind(e, discoverBind)) {
        e.preventDefault();
        window.toggleDiscoverView();
    }
});

window.handleNotificationAudioImport = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        customNotifAudioUrl = e.target.result;
        try { localStorage.setItem("hubpipe_custom_notif_audio", customNotifAudioUrl); } catch (err) {}
        window.showCustomDialog("Notification Audio", `Imported "${file.name}" for notifications.`);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
};

function playNotificationSound() {
    if (window.currentUser?.status === "Do Not Disturb") return;
    const enabled = document.getElementById("notif-sound-enabled")?.checked !== false;
    if (!enabled) return;
    if (customNotifAudioUrl) {
        const audio = new Audio(customNotifAudioUrl);
        audio.play().catch(() => {});
        return;
    }
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 660;
        gain.gain.value = 0.06;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.14);
    } catch (e) {}
}

window.requestMediaPermission = async function(kind, checkbox) {
    if (!checkbox.checked) return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: kind === "audio",
            video: kind === "video"
        });
        stream.getTracks().forEach(t => t.stop());
        window.showCustomDialog("Permission Granted", `${kind === "audio" ? "Microphone" : "Camera"} access enabled.`);
    } catch (err) {
        checkbox.checked = false;
        window.showCustomDialog("Permission Denied", `Could not access ${kind === "audio" ? "microphone" : "camera"}.`);
    }
};

window.toggleNotificationsPreference = function(checkbox) {
    if (checkbox.checked) {
        if (!("Notification" in window)) {
            checkbox.checked = false;
            return;
        }
        Notification.requestPermission().then(permission => {
            window.notificationsEnabled = permission === "granted";
            checkbox.checked = window.notificationsEnabled;
            localStorage.setItem(getAccountStorageKey("notifs"), String(window.notificationsEnabled));
        });
    } else {
        window.notificationsEnabled = false;
        localStorage.setItem(getAccountStorageKey("notifs"), "false");
    }
};

function triggerIncomingNotification(senderName, messageText) {
    playNotificationSound();
    if (
        window.currentUser?.status !== "Do Not Disturb" &&
        window.notificationsEnabled &&
        "Notification" in window &&
        Notification.permission === "granted" &&
        document.hidden
    ) {
        new Notification(`New message from @${senderName}`, {
            body: messageText,
            icon: "Assets/Images/logo-orange.png"
        });
    }
}

// ================= RIGHT-CLICK CONTEXT MENUS =================
function positionContextMenu(menuEl, pageX, pageY) {
    menuEl.style.display = "block";
    const maxLeft = window.innerWidth - menuEl.offsetWidth - 12;
    const maxTop = window.innerHeight - menuEl.offsetHeight - 12;
    menuEl.style.left = `${Math.max(8, Math.min(pageX, maxLeft))}px`;
    menuEl.style.top = `${Math.max(8, Math.min(pageY, maxTop))}px`;
}

document.addEventListener("contextmenu", (e) => {
    const msgRow = e.target.closest(".message-item-row");
    const serverRow = e.target.closest(".group-card-row");
    const friendRow = e.target.closest(".friend-list-row, .top-friend-chip");

    const msgMenu = document.getElementById("message-context-menu");
    const friendMenu = document.getElementById("friend-context-menu");
    const serverMenu = document.getElementById("server-context-menu");

    if (friendMenu) friendMenu.style.display = "none";
    if (serverMenu) serverMenu.style.display = "none";
    if (msgMenu) msgMenu.style.display = "none";

    if (msgRow && msgMenu) {
        e.preventDefault();
        const msgId = msgRow.dataset.msgId;
        const msgs = window.roomMessages[window.currentRoomId] || [];
        activeContextMessage = msgs.find(m => m.id === msgId) || null;
        const delBtn = document.getElementById("ctx-delete-message-btn");
        if (delBtn && activeContextMessage) {
            const isOwn = window.currentUser && normalizeHandle(activeContextMessage.authorName) === normalizeHandle(window.currentUser.name);
            delBtn.style.display = isOwn ? "block" : "none";
        }
        positionContextMenu(msgMenu, e.pageX, e.pageY);
    } else if (serverRow && serverMenu) {
        e.preventDefault();
        const roomId = serverRow.dataset.roomId;
        activeContextServer = window.activeRooms.find(r => r.id === roomId) || {
            id: roomId,
            name: serverRow.querySelector(".group-card-title")?.innerText || "Group Chat",
            desc: serverRow.querySelector(".group-card-desc")?.innerText || ""
        };
        const muteItem = serverMenu.querySelector('[onclick*="mute"]');
        if (muteItem) {
            muteItem.innerText = window.mutedServers.includes(activeContextServer.id) ? "Unmute Server" : "Mute Server";
        }
        positionContextMenu(serverMenu, e.pageX, e.pageY);
    } else if (friendRow && friendMenu) {
        e.preventDefault();
        activeContextFriend = friendRow.dataset.username || "Friend";
        positionContextMenu(friendMenu, e.pageX, e.pageY);
    }
});

document.addEventListener("click", (e) => {
    const friendMenu = document.getElementById("friend-context-menu");
    const serverMenu = document.getElementById("server-context-menu");
    const msgMenu = document.getElementById("message-context-menu");
    if (friendMenu && !e.target.closest("#friend-context-menu")) friendMenu.style.display = "none";
    if (serverMenu && !e.target.closest("#server-context-menu")) serverMenu.style.display = "none";
    if (msgMenu && !e.target.closest("#message-context-menu")) msgMenu.style.display = "none";
});

window.executeMessageContextAction = function(action) {
    const msgMenu = document.getElementById("message-context-menu");
    if (msgMenu) msgMenu.style.display = "none";
    if (!activeContextMessage) return;

    const msgs = window.roomMessages[window.currentRoomId] || [];
    const idx = msgs.findIndex(m => m.id === activeContextMessage.id);

    switch (action) {
        case "open": {
            window.openFilePreviewById(activeContextMessage.id);
            break;
        }
        case "reply": {
            window.setReplyTarget(activeContextMessage);
            break;
        }
        case "forward": {
            window.openForwardModal(activeContextMessage.id);
            break;
        }
        case "copy": {
            const copyVal = activeContextMessage.text || activeContextMessage.codeText || activeContextMessage.fileName || activeContextMessage.gif || "";
            if (copyVal && navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(copyVal).catch(() => {});
            }
            break;
        }
        case "react": {
            window.openReactionModal(activeContextMessage.id);
            break;
        }
        case "pin": {
            if (idx !== -1) {
                msgs[idx].pinned = !msgs[idx].pinned;
                saveAccountState();
                renderSavedRoomHistory(window.currentRoomId);
            }
            break;
        }
        case "delete": {
            if (idx !== -1) {
                const isOwn = window.currentUser && normalizeHandle(msgs[idx].authorName) === normalizeHandle(window.currentUser.name);
                if (!isOwn) {
                    window.showCustomDialog("Permission Denied", "You can only delete your own messages.");
                    break;
                }
                msgs.splice(idx, 1);
                saveAccountState();
                renderSavedRoomHistory(window.currentRoomId);
            }
            break;
        }
    }

    activeContextMessage = null;
};

window.executeContextAction = function(action) {
    const friendMenu = document.getElementById("friend-context-menu");
    if (friendMenu) friendMenu.style.display = "none";
    if (!activeContextFriend) return;

    const friendObj = window.friendsList.find(f => normalizeHandle(f.name) === normalizeHandle(activeContextFriend));

    switch (action) {
        case "profile":
            window.openUserProfileModal(activeContextFriend);
            break;
        case "call":
            if (friendObj) startDirectMessage(friendObj);
            window.startCallSession(`📞 Voice Call with @${activeContextFriend}`);
            break;
        case "videocall":
            if (friendObj) startDirectMessage(friendObj);
            window.startCallSession(`🎥 Video Call with @${activeContextFriend}`);
            break;
        case "stream":
            if (friendObj) startDirectMessage(friendObj);
            window.startCallSession(`🖥️ Screen Stream with @${activeContextFriend}`);
            break;
        case "report":
            window.openReportForm(`@${activeContextFriend}`);
            break;
        case "block":
            window.friendsList = window.friendsList.filter(f => normalizeHandle(f.name) !== normalizeHandle(activeContextFriend));
            saveAccountState();
            window.renderHubState();
            window.showCustomDialog("Blocked", `Blocked @${activeContextFriend}.`);
            break;
        case "nickname": {
            const nick = prompt(`Enter nickname for @${activeContextFriend}:`, friendObj?.nickname || "");
            if (nick !== null && friendObj) {
                friendObj.nickname = nick.trim();
                saveAccountState();
                window.renderHubState();
            }
            break;
        }
        case "pin": {
            if (friendObj) {
                window.friendsList = [friendObj, ...window.friendsList.filter(f => normalizeHandle(f.name) !== normalizeHandle(activeContextFriend))];
                saveAccountState();
                window.renderHubState();
            }
            break;
        }
        case "invite":
            window.showCustomDialog("Invited", `Invited @${activeContextFriend} to the active group chat.`);
            break;
        case "ignore":
            window.showCustomDialog("Ignored", `Ignored messages from @${activeContextFriend}.`);
            break;
        case "mute":
            window.showCustomDialog("Muted", `Muted notifications from @${activeContextFriend}.`);
            break;
    }

    activeContextFriend = null;
};

window.executeServerContextAction = function(action) {
    const serverMenu = document.getElementById("server-context-menu");
    if (serverMenu) serverMenu.style.display = "none";
    if (!activeContextServer) return;

    const target = activeContextServer;

    switch (action) {
        case "invite": {
            const inviteCode = target.id.replace(/^observable-group-/, "");
            const inviteLink = `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(inviteCode)}`;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(inviteLink).catch(() => {});
            }
            window.showCustomDialog("Invite Link Copied", `Invite link for "${target.name}" copied to clipboard:\n${inviteLink}`);
            break;
        }
        case "add-channel":
            window.switchRoom(target.id);
            window.addGroupChannel();
            break;
        case "add-voice":
            window.switchRoom(target.id);
            window.addGroupVoiceChannel();
            break;
        case "mark-read": {
            const foundRoom = window.activeRooms.find(r => r.id === target.id);
            if (foundRoom) foundRoom.unreadCount = 0;
            saveAccountState();
            window.renderHubState();
            break;
        }
        case "mute": {
            const idx = window.mutedServers.indexOf(target.id);
            if (idx === -1) {
                window.mutedServers.push(target.id);
                window.showCustomDialog("Muted", `Muted "${target.name}".`);
            } else {
                window.mutedServers.splice(idx, 1);
                window.showCustomDialog("Unmuted", `Unmuted "${target.name}".`);
            }
            saveAccountState();
            break;
        }
        case "edit":
            window.switchRoom(target.id);
            window.openServerEditorModal();
            break;
        case "leave": {
            if (!confirm(`Leave "${target.name}"?`)) break;
            window.activeRooms = window.activeRooms.filter(r => r.id !== target.id);
            saveAccountState();
            if (window.currentRoomId === target.id) {
                window.openHubView();
            }
            window.renderHubState();
            break;
        }
    }

    activeContextServer = null;
};