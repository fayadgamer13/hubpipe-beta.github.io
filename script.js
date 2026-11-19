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

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Keep users logged in across page reloads and browser restarts
setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.error("Persistence setup error:", err);
});

let drone = null;
let room = null;
let pendingUser = null;
let pendingGroupBannerDataUrl = null;
let activeContextFriend = null;
let activeContextServer = null;
let autoEnteredApp = false;

window.isSignUpMode = false;
window.currentModalTab = 'group';
window.currentUser = null;
window.currentRoomId = 'observable-general';

// Strictly empty at startup — populated only when users add friends or create groups
window.activeRooms = JSON.parse(localStorage.getItem('hubpipe_user_rooms') || '[]');
window.discoverableGroups = JSON.parse(localStorage.getItem('hubpipe_discover_groups') || '[]');
window.friendsList = JSON.parse(localStorage.getItem('hubpipe_friends') || '[]');
window.roomMessages = JSON.parse(localStorage.getItem('hubpipe_room_messages') || '{}');
window.mutedServers = JSON.parse(localStorage.getItem('hubpipe_muted_servers') || '[]');
window.notificationsEnabled = localStorage.getItem('hubpipe_notifs') === 'true';

function saveAppState() {
    localStorage.setItem('hubpipe_user_rooms', JSON.stringify(window.activeRooms));
    localStorage.setItem('hubpipe_discover_groups', JSON.stringify(window.discoverableGroups));
    localStorage.setItem('hubpipe_friends', JSON.stringify(window.friendsList));
    localStorage.setItem('hubpipe_room_messages', JSON.stringify(window.roomMessages));
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.innerText = str ?? '';
    return div.innerHTML;
}

// ================= STARTUP: OS DETECTION, THEME, WALLPAPER & SESSION =================
window.addEventListener('DOMContentLoaded', () => {
    const ua = navigator.userAgent;
    let os = "Windows";
    if (ua.includes("Mac")) os = "macOS";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("Linux")) os = "Linux";

    const titleEl = document.getElementById('os-detect-title');
    const btnEl = document.getElementById('os-download-btn');
    if (titleEl) titleEl.innerText = `Download HubPipe for your “${os}”`;
    if (btnEl) btnEl.innerText = `Downloads for [${os}]`;

    const notifToggle = document.getElementById('notif-toggle-input');
    if (notifToggle) notifToggle.checked = window.notificationsEnabled;

    const savedTheme = localStorage.getItem('hubpipe_theme');
    if (savedTheme) {
        try {
            const parsed = JSON.parse(savedTheme);
            applyThemeColors(parsed.accent, parsed.sidebar, parsed.hubBg, parsed.mode || 'dark');
        } catch (e) {
            console.error("Failed to parse saved theme:", e);
        }
    }

    const savedWall = localStorage.getItem('hubpipe_wallpaper');
    if (savedWall) {
        setHubWallpaper(savedWall);
        const wallInput = document.getElementById('wallpaper-url-input');
        if (wallInput) wallInput.value = savedWall;
    }
});

onAuthStateChanged(auth, (user) => {
    if (user && user.displayName && !autoEnteredApp) {
        autoEnteredApp = true;
        enterChatApp(user);
    }
});

// ================= LANDING, DOWNLOADS & REPORT =================
window.showLandingTab = function(tabName) {
    document.querySelectorAll('.landing-content').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
};

window.scrollToOsGrid = function() {
    document.getElementById('os-grid-section').scrollIntoView({ behavior: 'smooth' });
};

window.toggleReportForm = function() {
    const formSection = document.getElementById('report-form-section');
    const isHidden = formSection.style.display === 'none';
    formSection.style.display = isHidden ? 'block' : 'none';
    if (isHidden) formSection.scrollIntoView({ behavior: 'smooth' });
};

window.handleReportSubmit = function(event) {
    event.preventDefault();
    alert("Report submitted successfully! Thank you.");
    event.target.reset();
    document.getElementById('report-form-section').style.display = 'none';
    window.showLandingTab('home');
};

window.openAuthScreen = function(mode) {
    document.getElementById('landing-screen').classList.remove('active');
    document.getElementById('auth-screen').classList.add('active');
    window.switchAuthMode(mode);
};

window.backToLanding = function() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('landing-screen').classList.add('active');
};

// ================= AUTHENTICATION FLOW =================
window.handleBottomAuthClick = function(targetMode) {
    const authForm = document.getElementById('auth-form');
    if (authForm.style.display === 'none') {
        window.switchAuthMode(targetMode);
        return;
    }

    if ((targetMode === 'login' && !window.isSignUpMode) || (targetMode === 'signup' && window.isSignUpMode)) {
        authForm.requestSubmit();
    } else {
        window.switchAuthMode(targetMode);
    }
};

window.switchAuthMode = function(mode) {
    const authForm = document.getElementById('auth-form');
    const forgotForm = document.getElementById('forgot-form');
    const inboxNotice = document.getElementById('inbox-notice');
    const setupForm = document.getElementById('final-setup-form');
    const bottomBtns = document.getElementById('auth-bottom-buttons');
    const submitBtn = document.getElementById('main-auth-submit-btn');

    authForm.style.display = 'none';
    forgotForm.style.display = 'none';
    inboxNotice.style.display = 'none';
    setupForm.style.display = 'none';
    bottomBtns.style.display = (mode === 'login' || mode === 'signup') ? 'flex' : 'none';

    const btnLogin = document.getElementById('btn-bottom-login');
    const btnSignup = document.getElementById('btn-bottom-signup');

    if (mode === 'login') {
        window.isSignUpMode = false;
        authForm.style.display = 'block';
        submitBtn.style.display = 'none';
        document.getElementById('auth-title').innerText = 'Login';
        document.getElementById('email-label').innerText = 'Email or Username';
        document.getElementById('verify-group').style.display = 'none';
        document.getElementById('password-verify').required = false;
        document.getElementById('login-helpers').style.display = 'block';
        btnLogin.className = 'pill-btn-light-orange';
        btnSignup.className = 'pill-btn-orange';
    } else if (mode === 'signup') {
        window.isSignUpMode = true;
        authForm.style.display = 'block';
        submitBtn.style.display = 'block';
        submitBtn.innerText = 'Create & Verify';
        document.getElementById('auth-title').innerText = 'Sign Up';
        document.getElementById('email-label').innerText = 'Email';
        document.getElementById('verify-group').style.display = 'block';
        document.getElementById('password-verify').required = true;
        document.getElementById('login-helpers').style.display = 'none';
        btnLogin.className = 'pill-btn-orange';
        btnSignup.className = 'pill-btn-light-orange';
    } else if (mode === 'forgot') {
        document.getElementById('auth-title').innerText = 'Forgot Password?';
        forgotForm.style.display = 'block';
    } else if (mode === 'inbox-reset') {
        document.getElementById('auth-title').innerText = 'Check your inbox';
        document.getElementById('inbox-message').innerHTML = `You should see an mail to change your password<br>if you dont see it check your spam folder.`;
        const actionBtn = document.getElementById('inbox-action-btn');
        actionBtn.innerText = 'OK, Open Mail';
        actionBtn.onclick = () => window.switchAuthMode('login');
        inboxNotice.style.display = 'block';
    } else if (mode === 'inbox-verify') {
        document.getElementById('auth-title').innerText = 'Check your inbox';
        document.getElementById('inbox-message').innerHTML = `
            To complete setting up your<br>Account. check your mailbox<br>for an email from HubPipe<br>to verify your account.<br><br>
            <span style="font-size: 13px; color: #888888;">if you don't see an mail check your<br>spam folder</span>
        `;
        const actionBtn = document.getElementById('inbox-action-btn');
        actionBtn.innerText = 'Ok, Open Mail';
        actionBtn.onclick = () => window.switchAuthMode('setup');
        inboxNotice.style.display = 'block';
    } else if (mode === 'setup') {
        document.getElementById('auth-title').innerText = 'Final Setup';
        setupForm.style.display = 'block';
    }
};

window.handleAuth = function(event) {
    event.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (window.isSignUpMode) {
        const verify = document.getElementById('password-verify').value;
        if (password !== verify) {
            alert("Passwords do not match!");
            return;
        }

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                pendingUser = userCredential.user;
                sendEmailVerification(pendingUser).catch(() => {});
                window.switchAuthMode('inbox-verify');
            })
            .catch((err) => alert(err.message));
    } else {
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                if (!userCredential.user.displayName) {
                    pendingUser = userCredential.user;
                    window.switchAuthMode('setup');
                } else {
                    autoEnteredApp = true;
                    enterChatApp(userCredential.user);
                }
            })
            .catch((err) => alert(err.message));
    }
};

window.handleGoogleSignIn = function() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then((result) => {
            if (!result.user.displayName) {
                pendingUser = result.user;
                window.switchAuthMode('setup');
            } else {
                autoEnteredApp = true;
                enterChatApp(result.user);
            }
        })
        .catch((err) => alert(err.message));
};

window.handleForgotPassword = function(event) {
    event.preventDefault();
    const email = document.getElementById('forgot-email').value.trim();
    sendPasswordResetEmail(auth, email)
        .then(() => {
            window.switchAuthMode('inbox-reset');
        })
        .catch((err) => alert(err.message));
};

window.completeFinalSetup = function(event) {
    event.preventDefault();
    const chosenUsername = document.getElementById('setup-username').value.trim().replace(/^@/, '');
    if (!chosenUsername) return;

    const user = pendingUser || auth.currentUser;
    if (!user) return;

    const avatarUrl = "https://api.dicebear.com/7.x/bottts/svg?seed=" + encodeURIComponent(chosenUsername);
    updateProfile(user, {
        displayName: chosenUsername,
        photoURL: avatarUrl
    }).then(() => {
        autoEnteredApp = true;
        enterChatApp(user);
    }).catch((err) => alert(err.message));
};

// ================= LOADING & APP INITIALIZATION =================
function enterChatApp(user) {
    const savedAvatar = localStorage.getItem('hubpipe_custom_avatar');
    const randomTag = "#" + (Math.floor(1000 + Math.random() * 9000));
    const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
    const pfp = savedAvatar || user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`;

    window.currentUser = {
        uid: user.uid,
        name: displayName,
        tag: randomTag,
        pfp
    };

    document.getElementById('landing-screen').classList.remove('active');
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('loading-screen').classList.add('active');

    document.getElementById('footer-username').innerText = '@' + window.currentUser.name;
    document.getElementById('footer-tag').innerText = window.currentUser.tag;
    document.getElementById('footer-pfp').src = window.currentUser.pfp;

    document.getElementById('profile-username-input').value = window.currentUser.name;
    document.getElementById('profile-pfp-preview').src = window.currentUser.pfp;

    window.renderHubState();
    initScaledrone(window.currentUser);

    setTimeout(() => {
        document.getElementById('loading-screen').classList.remove('active');
        document.getElementById('chat-screen').classList.add('active');
    }, 1400);
}

// ================= SCALEDRONE & MESSAGE HISTORY ENGINE =================
function initScaledrone(userObj) {
    if (drone) {
        try { drone.close(); } catch (e) {}
    }

    drone = new Scaledrone('XIPWg3VjezdtvgAk', {
        data: {
            name: userObj.name,
            tag: userObj.tag,
            pfp: userObj.pfp
        }
    });

    drone.on('open', error => {
        if (error) console.error("Scaledrone error:", error);
    });
}

function recordAndRenderMessage(targetRoomId, msgData, isOwnMessage = false) {
    if (!window.roomMessages[targetRoomId]) {
        window.roomMessages[targetRoomId] = [];
    }
    window.roomMessages[targetRoomId].push(msgData);
    saveAppState();

    if (targetRoomId === window.currentRoomId) {
        appendMessageToLog(msgData);
    }

    const previewText = msgData.text || (msgData.gif ? '[GIF]' : '[Media]');
    const roomIndex = window.activeRooms.findIndex(r => r.id === targetRoomId);

    if (roomIndex === -1 && !isOwnMessage) {
        window.activeRooms.unshift({
            id: targetRoomId,
            name: `@${msgData.authorName}`,
            desc: previewText,
            type: targetRoomId.startsWith('observable-dm-') ? 'dm' : 'group'
        });
        saveAppState();
        window.renderHubState();
    } else if (roomIndex !== -1) {
        const updatedRoom = window.activeRooms.splice(roomIndex, 1)[0];
        updatedRoom.desc = previewText;
        window.activeRooms.unshift(updatedRoom);
        saveAppState();
        window.renderHubState();
    }
}

function appendMessageToLog(msgData) {
    const messageContainer = document.getElementById('messages-log');
    if (!messageContainer) return;

    const msgRow = document.createElement('div');
    msgRow.className = 'message-item-row';
    msgRow.innerHTML = `
        <img src="${msgData.authorPfp}" alt="Avatar">
        <div class="msg-content-block">
            <div class="msg-author-time">
                <span class="msg-name">@${escapeHTML(msgData.authorName)}</span>
                <span class="msg-timestamp">${escapeHTML(msgData.time)}</span>
            </div>
            ${msgData.text ? `<div class="msg-text-body">${escapeHTML(msgData.text)}</div>` : ''}
            ${msgData.gif ? `<img class="msg-gif" src="${msgData.gif}" alt="GIF">` : ''}
        </div>
    `;
    messageContainer.appendChild(msgRow);
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

function renderSavedRoomHistory(roomId) {
    const messageContainer = document.getElementById('messages-log');
    if (!messageContainer) return;
    messageContainer.innerHTML = '';

    const history = window.roomMessages[roomId] || [];
    history.forEach(msgData => appendMessageToLog(msgData));
}

function subscribeToRoom(roomId) {
    if (!drone) return;
    if (room) {
        try { room.unsubscribe(); } catch (e) {}
    }

    const subscribedRoomId = roomId;
    room = drone.subscribe(subscribedRoomId);

    room.on('members', members => {
        if (window.currentRoomId === subscribedRoomId) {
            renderMembersSidebar(members);
        }
    });

    room.on('member_join', member => {
        if (window.currentRoomId === subscribedRoomId) {
            appendSystemNotice(`@${member.clientData?.name || 'User'} joined the chat`);
        }
    });

    room.on('member_leave', member => {
        if (window.currentRoomId === subscribedRoomId && member.clientData) {
            appendSystemNotice(`@${member.clientData.name} left the chat`);
        }
    });

    room.on('data', (payload, member) => {
        const authorName = member?.clientData?.name || 'HubPipe';
        const authorPfp = member?.clientData?.pfp || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(authorName)}`;
        const isMe = window.currentUser && authorName === window.currentUser.name;

        const textContent = typeof payload === 'string' ? payload : (payload.text || '');
        const gifUrl = typeof payload === 'object' ? (payload.gif || null) : null;
        const timeStr = (typeof payload === 'object' && payload.time)
            ? payload.time
            : `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${new Date().toLocaleDateString()}`;

        const history = window.roomMessages[subscribedRoomId] || [];
        const alreadySaved = isMe && history.some(m => m.text === textContent && m.gif === gifUrl && m.time === timeStr);
        if (alreadySaved) return;

        recordAndRenderMessage(subscribedRoomId, {
            authorName,
            authorPfp,
            text: textContent,
            gif: gifUrl,
            time: timeStr
        }, isMe);

        if (!isMe && !window.mutedServers.includes(subscribedRoomId)) {
            triggerIncomingNotification(authorName, textContent || '[Sent a GIF]');
        }
    });
}

function appendSystemNotice(text) {
    const messageContainer = document.getElementById('messages-log');
    if (!messageContainer) return;
    const notice = document.createElement('div');
    notice.style.textAlign = 'center';
    notice.style.fontSize = '12px';
    notice.style.color = '#777777';
    notice.style.margin = '4px 0';
    notice.innerText = `— ${text} —`;
    messageContainer.appendChild(notice);
}

// ================= HUB, SIDEBAR & VIEW MANAGEMENT =================
window.openHubView = function() {
    document.getElementById('active-chat-container').classList.remove('active');
    document.getElementById('discover-container').classList.remove('active');
    document.getElementById('hub-home-view').classList.add('active');
    document.getElementById('main-hub-top-bar').style.display = 'flex';

    document.getElementById('right-sidebar-title').innerText = 'List of Friends';
    document.getElementById('members-list').style.display = 'none';
    document.getElementById('right-friends-list').style.display = window.friendsList.length > 0 ? 'flex' : 'none';
    document.getElementById('right-friends-empty').style.display = window.friendsList.length > 0 ? 'none' : 'flex';
};

window.toggleLeftSidebar = function() {
    const sb = document.getElementById('left-sidebar');
    const btn = sb.querySelector('.sidebar-collapse-tab');
    sb.classList.toggle('collapsed');
    btn.innerText = sb.classList.contains('collapsed') ? '>' : '<';
};

window.toggleRightSidebar = function() {
    const sb = document.getElementById('right-sidebar');
    sb.style.display = sb.style.display === 'none' ? 'flex' : 'none';
};

window.renderHubState = function() {
    const hasFriends = window.friendsList.length > 0;
    const hasGroups = window.activeRooms.length > 0;

    document.getElementById('online-status-text').innerText = hasFriends
        ? `Online: ${window.friendsList.length}`
        : 'Online: [NO FRIENDS]';
    document.getElementById('hub-pin-icon').style.display = (hasFriends || hasGroups) ? 'inline' : 'none';
    document.getElementById('hub-people-icon').style.display = (hasFriends || hasGroups) ? 'inline' : 'none';

    const topFriendsSec = document.getElementById('top-friends-section');
    const topFriendsRow = document.getElementById('top-friends-row');
    topFriendsSec.style.display = hasFriends ? 'block' : 'none';
    topFriendsRow.innerHTML = '';

    window.friendsList.slice(0, 2).forEach((f, idx) => {
        const chip = document.createElement('div');
        chip.className = 'top-friend-chip';
        chip.dataset.username = f.name;
        chip.innerHTML = `
            <img src="${f.pfp}" alt="${escapeHTML(f.name)}">
            ${idx === 0 ? '<span class="notif-badge">1</span>' : ''}
            <span>@${escapeHTML(f.nickname || f.name)}</span>
        `;
        chip.onclick = () => startDirectMessage(f);
        topFriendsRow.appendChild(chip);
    });

    const groupsEmpty = document.getElementById('sidebar-groups-empty');
    const roomsList = document.getElementById('rooms-list');
    groupsEmpty.style.display = hasGroups ? 'none' : 'flex';
    roomsList.innerHTML = '';

    window.activeRooms.forEach(roomItem => {
        const card = document.createElement('div');
        card.className = 'group-card-row';
        card.dataset.roomId = roomItem.id;
        if (roomItem.id === window.currentRoomId && document.getElementById('active-chat-container').classList.contains('active')) {
            card.classList.add('active');
        }
        card.innerHTML = `
            <img class="group-thumb" src="${roomItem.banner || 'Assets/Images/logo-orange.png'}" alt="Group">
            <div class="group-card-info">
                <div class="group-card-title">${escapeHTML(roomItem.name)}</div>
                <div class="group-card-desc">${escapeHTML(roomItem.desc)}</div>
            </div>
        `;
        card.onclick = () => {
            window.switchRoom(roomItem.id);
        };
        roomsList.appendChild(card);
    });

    const hubEmpty = document.getElementById('hub-friends-empty');
    const hubList = document.getElementById('hub-friends-list');
    const rightEmpty = document.getElementById('right-friends-empty');
    const rightList = document.getElementById('right-friends-list');

    hubEmpty.style.display = hasFriends ? 'none' : 'flex';
    if (document.getElementById('hub-home-view').classList.contains('active')) {
        rightEmpty.style.display = hasFriends ? 'none' : 'flex';
        rightList.style.display = hasFriends ? 'flex' : 'none';
    }
    hubList.innerHTML = '';
    rightList.innerHTML = '';

    window.friendsList.forEach(friend => {
        const label = friend.nickname ? `${friend.nickname} (@${friend.name})` : `@${friend.name} ${friend.tag}`;
        const rowHTML = `
            <img src="${friend.pfp}" alt="${escapeHTML(friend.name)}">
            <span>${escapeHTML(label)}</span>
        `;

        const centerRow = document.createElement('div');
        centerRow.className = 'friend-list-row';
        centerRow.dataset.username = friend.name;
        centerRow.innerHTML = rowHTML;
        centerRow.onclick = () => startDirectMessage(friend);
        hubList.appendChild(centerRow);

        const rightRow = document.createElement('div');
        rightRow.className = 'friend-list-row';
        rightRow.dataset.username = friend.name;
        rightRow.innerHTML = rowHTML;
        rightRow.onclick = () => startDirectMessage(friend);
        rightList.appendChild(rightRow);
    });
};

window.switchRoom = function(roomId) {
    window.currentRoomId = roomId;
    window.renderHubState();

    const targetRoom = window.activeRooms.find(r => r.id === roomId) || {
        id: roomId,
        name: roomId.replace('observable-group-', '').replace('observable-', ''),
        desc: 'Hello this is a group chat Description!',
        banner: null,
        type: 'group'
    };

    document.getElementById('hub-home-view').classList.remove('active');
    document.getElementById('discover-container').classList.remove('active');
    document.getElementById('active-chat-container').classList.add('active');
    document.getElementById('main-hub-top-bar').style.display = 'flex';

    document.getElementById('current-room-banner').src = targetRoom.banner || 'Assets/Images/logo-orange.png';
    document.getElementById('current-room-title').innerText = targetRoom.name;
    document.getElementById('current-room-desc').innerText = targetRoom.desc;

    renderSavedRoomHistory(roomId);

    document.getElementById('right-sidebar-title').innerText = 'List of Chat Members';
    document.getElementById('right-friends-empty').style.display = 'none';
    document.getElementById('right-friends-list').style.display = 'none';
    document.getElementById('members-list').style.display = 'flex';

    renderMembersSidebar([{ clientData: window.currentUser }]);
    subscribeToRoom(roomId);
};

function startDirectMessage(friend) {
    const dmId = `observable-dm-${[window.currentUser.name, friend.name].sort().join('-')}`;
    if (!window.activeRooms.some(r => r.id === dmId)) {
        window.activeRooms.unshift({
            id: dmId,
            name: `@${friend.name} ${friend.tag}`,
            desc: `Direct Message with @${friend.name}`,
            banner: friend.pfp,
            type: 'dm'
        });
        saveAppState();
    }
    window.switchRoom(dmId);
}

function renderMembersSidebar(members) {
    const list = document.getElementById('members-list');
    list.innerHTML = '';
    members.forEach((m, index) => {
        const name = m.clientData?.name || 'Guest';
        const tag = m.clientData?.tag || '#0000';
        const pfp = m.clientData?.pfp || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;
        const row = document.createElement('div');
        row.className = 'member-item-row';
        row.innerHTML = `
            <img src="${pfp}" alt="Avatar">
            <span>@${escapeHTML(name)} ${tag}${index === 0 ? ' - 👑' : ''}</span>
        `;
        list.appendChild(row);
    });
}

window.handleHubSearch = function() {
    const query = document.getElementById('hub-search-input').value.toLowerCase();
    document.querySelectorAll('#hub-friends-list .friend-list-row').forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(query) ? 'flex' : 'none';
    });
    document.querySelectorAll('#messages-log .message-item-row').forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(query) ? 'flex' : 'none';
    });
};

// ================= DISCOVER GROUPS VIEW =================
window.toggleDiscoverView = function() {
    const discoverPane = document.getElementById('discover-container');
    const showingDiscover = discoverPane.classList.contains('active');

    if (showingDiscover) {
        window.openHubView();
    } else {
        document.getElementById('hub-home-view').classList.remove('active');
        document.getElementById('active-chat-container').classList.remove('active');
        document.getElementById('main-hub-top-bar').style.display = 'none';
        discoverPane.classList.add('active');
        window.renderDiscoverCards();
    }
};

window.renderDiscoverCards = function() {
    const searchInput = document.getElementById('discover-search');
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    const grid = document.getElementById('discover-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const filteredGroups = window.discoverableGroups.filter(
        g => g.name.toLowerCase().includes(query) || g.desc.toLowerCase().includes(query)
    );

    if (filteredGroups.length === 0) {
        grid.style.display = 'flex';
        grid.style.justifyContent = 'center';
        grid.style.alignItems = 'center';
        grid.style.minHeight = '240px';
        grid.innerHTML = `
            <div style="color: #888888; font-size: 15px; font-weight: 600; text-align: center;">
                No group chats created yet. Click "Create Group +" to create one!
            </div>
        `;
        return;
    }

    grid.style.display = 'grid';
    filteredGroups.forEach(group => {
        const card = document.createElement('div');
        card.className = 'discover-preview-card';
        card.innerHTML = `
            <img class="discover-card-thumb" src="${group.banner || 'Assets/Images/logo-orange.png'}" alt="Group">
            <div class="discover-card-info">
                <div class="discover-card-name">${escapeHTML(group.name)}</div>
                <div class="discover-card-desc">${escapeHTML(group.desc)}</div>
            </div>
        `;
        card.onclick = () => {
            if (!window.activeRooms.some(r => r.id === group.id)) {
                window.activeRooms.push({
                    id: group.id,
                    name: group.name,
                    desc: group.desc,
                    banner: group.banner || null,
                    type: 'group'
                });
                saveAppState();
            }
            window.switchRoom(group.id);
        };
        grid.appendChild(card);
    });
};

// ================= MESSAGING, EMOJI, GIF & FILES =================
window.sendMessage = function(event) {
    event.preventDefault();
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    if (!text || !drone) return;

    const now = new Date();
    const timeStr = `${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${now.toLocaleDateString()}`;
    const targetRoom = window.currentRoomId;

    recordAndRenderMessage(targetRoom, {
        authorName: window.currentUser?.name || 'You',
        authorPfp: window.currentUser?.pfp || 'https://api.dicebear.com/7.x/bottts/svg?seed=default',
        text,
        gif: null,
        time: timeStr
    }, true);

    drone.publish({
        room: targetRoom,
        message: { text, time: timeStr }
    });
    input.value = '';
};

window.togglePicker = function(type) {
    const picker = document.getElementById('media-picker');
    const content = document.getElementById('picker-content');

    if (picker.style.display === 'block' && picker.dataset.type === type) {
        picker.style.display = 'none';
        return;
    }

    picker.style.display = 'block';
    picker.dataset.type = type;
    content.innerHTML = '';

    if (type === 'emoji') {
        const emojis = ['😎', '😊', '🔥', '🎉', '👍', '😂', '👑', '🚀', '💬', '❤️'];
        emojis.forEach(em => {
            const btn = document.createElement('div');
            btn.className = 'picker-item';
            btn.innerText = em;
            btn.onclick = () => {
                document.getElementById('message-input').value += em;
                picker.style.display = 'none';
            };
            content.appendChild(btn);
        });
    } else if (type === 'gif') {
        const gifs = [
            { label: 'Wave 👋', url: 'https://media.giphy.com/media/hvRJCLFzcasrR4ia7z/giphy.gif' },
            { label: 'Thumbs Up 👍', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
            { label: 'Party 🎉', url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' }
        ];
        gifs.forEach(g => {
            const btn = document.createElement('button');
            btn.className = 'secondary-btn';
            btn.innerText = g.label;
            btn.onclick = () => {
                const now = new Date();
                const timeStr = `${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${now.toLocaleDateString()}`;
                const targetRoom = window.currentRoomId;

                recordAndRenderMessage(targetRoom, {
                    authorName: window.currentUser?.name || 'You',
                    authorPfp: window.currentUser?.pfp || 'https://api.dicebear.com/7.x/bottts/svg?seed=default',
                    text: '',
                    gif: g.url,
                    time: timeStr
                }, true);

                drone.publish({
                    room: targetRoom,
                    message: { text: '', gif: g.url, time: timeStr }
                });
                picker.style.display = 'none';
            };
            content.appendChild(btn);
        });
    }
};

window.handleFileAttachment = function(event) {
    const file = event.target.files[0];
    if (!file || !drone) return;
    const now = new Date();
    const timeStr = `${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${now.toLocaleDateString()}`;
    const targetRoom = window.currentRoomId;
    const text = `📎 Attached file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

    recordAndRenderMessage(targetRoom, {
        authorName: window.currentUser?.name || 'You',
        authorPfp: window.currentUser?.pfp || 'https://api.dicebear.com/7.x/bottts/svg?seed=default',
        text,
        gif: null,
        time: timeStr
    }, true);

    drone.publish({
        room: targetRoom,
        message: { text, time: timeStr }
    });
    event.target.value = '';
};

// ================= MODALS: GROUP, FRIEND, AVATAR & PROFILE =================
window.openCreateModal = function(tab) {
    document.getElementById('create-modal').style.display = 'flex';
    window.switchModalTab(tab);
};

window.closeModal = function() {
    document.getElementById('create-modal').style.display = 'none';
    document.getElementById('modal-input').value = '';
    document.getElementById('modal-desc-input').value = '';
    const bannerInput = document.getElementById('group-banner-input');
    if (bannerInput) bannerInput.value = '';
    pendingGroupBannerDataUrl = null;
};

window.switchModalTab = function(tab) {
    window.currentModalTab = tab;
    document.getElementById('modal-tab-group').classList.toggle('active', tab === 'group');
    document.getElementById('modal-tab-dm').classList.toggle('active', tab === 'dm');

    const descInput = document.getElementById('modal-desc-input');
    const bannerWrap = document.getElementById('group-banner-upload-wrap');

    if (tab === 'dm') {
        document.getElementById('modal-heading').innerText = 'Add Friend +';
        document.getElementById('modal-input').placeholder = 'Enter friend username (e.g. Tommy456)';
        descInput.style.display = 'none';
        if (bannerWrap) bannerWrap.style.display = 'none';
    } else {
        document.getElementById('modal-heading').innerText = 'Create Group +';
        document.getElementById('modal-input').placeholder = 'Group Chat Name';
        descInput.style.display = 'block';
        if (bannerWrap) bannerWrap.style.display = 'block';
    }
};

window.handleGroupBannerUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        pendingGroupBannerDataUrl = e.target.result;
    };
    reader.readAsDataURL(file);
};

window.createNewChat = function() {
    const inputVal = document.getElementById('modal-input').value.trim().replace(/^@/, '');
    const descVal = document.getElementById('modal-desc-input').value.trim();
    if (!inputVal) return;

    if (window.currentModalTab === 'dm') {
        if (!window.friendsList.some(f => f.name.toLowerCase() === inputVal.toLowerCase())) {
            window.friendsList.push({
                name: inputVal,
                tag: '#' + Math.floor(1000 + Math.random() * 9000),
                pfp: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(inputVal)}`
            });
            saveAppState();
        }
        window.closeModal();
        window.renderHubState();
        return;
    }

    const roomId = `observable-group-${inputVal.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const newGroupObj = {
        id: roomId,
        name: inputVal,
        desc: descVal || 'Hello this is a Group Chat Description!',
        banner: pendingGroupBannerDataUrl || null,
        type: 'group'
    };

    window.activeRooms.unshift(newGroupObj);
    window.discoverableGroups.unshift(newGroupObj);
    saveAppState();

    window.closeModal();
    window.renderDiscoverCards();
    window.switchRoom(roomId);
};

window.openProfileModal = function() {
    document.getElementById('profile-modal').style.display = 'flex';
};

window.closeProfileModal = function() {
    document.getElementById('profile-modal').style.display = 'none';
};

window.handleCustomAvatarUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('profile-pfp-preview').src = e.target.result;
    };
    reader.readAsDataURL(file);
};

window.saveProfileChanges = function() {
    const newName = document.getElementById('profile-username-input').value.trim().replace(/^@/, '');
    const newPfp = document.getElementById('profile-pfp-preview').src;

    if (newName && window.currentUser) {
        window.currentUser.name = newName;
        window.currentUser.pfp = newPfp;
        document.getElementById('footer-username').innerText = '@' + newName;
        document.getElementById('footer-pfp').src = newPfp;

        if (newPfp.startsWith('data:')) {
            localStorage.setItem('hubpipe_custom_avatar', newPfp);
        } else {
            localStorage.removeItem('hubpipe_custom_avatar');
            if (auth.currentUser) {
                updateProfile(auth.currentUser, { displayName: newName, photoURL: newPfp }).catch(() => {});
            }
        }
    }

    const accent = document.getElementById('theme-accent-picker').value;
    const sidebar = document.getElementById('theme-sidebar-picker').value;
    const hubBg = document.getElementById('theme-bg-picker').value;
    const isLight = parseInt(hubBg.replace('#', ''), 16) > 0x888888;
    applyThemeColors(accent, sidebar, hubBg, isLight ? 'light' : 'dark');
    localStorage.setItem('hubpipe_theme', JSON.stringify({ accent, sidebar, hubBg, mode: isLight ? 'light' : 'dark' }));

    alert("Profile & settings saved!");
    window.closeProfileModal();
};

window.logOutApp = function() {
    autoEnteredApp = false;
    signOut(auth).then(() => {
        location.reload();
    });
};

window.deleteAccountApp = function() {
    if (confirm("Are you absolutely sure you want to delete your HubPipe Account? This cannot be undone.")) {
        if (auth.currentUser) {
            deleteUser(auth.currentUser).then(() => {
                localStorage.clear();
                alert("Account completely deleted.");
                location.reload();
            }).catch(err => alert("Please re-authenticate or log back in before deleting your account: " + err.message));
        }
    }
};

// ================= THEMES, WALLPAPER & NOTIFICATIONS =================
function applyThemeColors(accent, sidebar, hubBg, mode = 'dark') {
    document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.style.setProperty('--primary', accent);
    document.documentElement.style.setProperty('--primary-hover', accent);
    document.documentElement.style.setProperty('--bg-sidebar', sidebar);
    document.documentElement.style.setProperty('--bg-hub', hubBg);

    const accentPicker = document.getElementById('theme-accent-picker');
    const sidebarPicker = document.getElementById('theme-sidebar-picker');
    const bgPicker = document.getElementById('theme-bg-picker');
    if (accentPicker && accent.startsWith('#')) accentPicker.value = accent;
    if (sidebarPicker && sidebar.startsWith('#')) sidebarPicker.value = sidebar;
    if (bgPicker && hubBg.startsWith('#')) bgPicker.value = hubBg;
}

window.applyThemePreset = function(accent, sidebar, hubBg, mode = 'dark') {
    applyThemeColors(accent, sidebar, hubBg, mode);
    localStorage.setItem('hubpipe_theme', JSON.stringify({ accent, sidebar, hubBg, mode }));
};

window.applyGradientTheme = function(gradientCss, sidebar, hubBg) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.setProperty('--primary', gradientCss);
    document.documentElement.style.setProperty('--primary-hover', gradientCss);
    document.documentElement.style.setProperty('--bg-sidebar', sidebar);
    document.documentElement.style.setProperty('--bg-hub', hubBg);
    localStorage.setItem('hubpipe_theme', JSON.stringify({ accent: gradientCss, sidebar, hubBg, mode: 'dark' }));
};

window.previewCustomTheme = function() {
    const accent = document.getElementById('theme-accent-picker').value;
    const sidebar = document.getElementById('theme-sidebar-picker').value;
    const hubBg = document.getElementById('theme-bg-picker').value;
    const isLight = parseInt(hubBg.replace('#', ''), 16) > 0x888888;
    applyThemeColors(accent, sidebar, hubBg, isLight ? 'light' : 'dark');
};

window.resetDefaultTheme = function() {
    window.applyThemePreset('#ff6600', '#000000', '#1c1c1c', 'dark');
    localStorage.removeItem('hubpipe_wallpaper');
    const centerPane = document.querySelector('.center-pane');
    if (centerPane) centerPane.style.backgroundImage = '';
};

function setHubWallpaper(url) {
    const centerPane = document.querySelector('.center-pane');
    if (centerPane) {
        centerPane.style.backgroundImage = `url('${url.replace(/'/g, "%27")}')`;
        centerPane.style.backgroundSize = 'cover';
        centerPane.style.backgroundPosition = 'center';
    }
}

window.applyCustomWallpaper = function() {
    const url = document.getElementById('wallpaper-url-input').value.trim();
    if (!url) return;
    setHubWallpaper(url);
    localStorage.setItem('hubpipe_wallpaper', url);
    alert("Custom wallpaper applied!");
};

window.toggleNotificationsPreference = function(checkbox) {
    if (checkbox.checked) {
        if (!('Notification' in window)) {
            checkbox.checked = false;
            return;
        }
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                window.notificationsEnabled = true;
                localStorage.setItem('hubpipe_notifs', 'true');
            } else {
                checkbox.checked = false;
                window.notificationsEnabled = false;
                localStorage.setItem('hubpipe_notifs', 'false');
            }
        });
    } else {
        window.notificationsEnabled = false;
        localStorage.setItem('hubpipe_notifs', 'false');
    }
};

function triggerIncomingNotification(senderName, messageText) {
    if (window.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification(`New message from @${senderName}`, {
            body: messageText,
            icon: 'Assets/Images/logo-orange.png'
        });
    }
}

// ================= RIGHT-CLICK CONTEXT MENUS (FRIENDS & SERVERS) =================
document.addEventListener('contextmenu', (e) => {
    const serverRow = e.target.closest('.group-card-row');
    const friendRow = e.target.closest('.friend-list-row, .top-friend-chip');
    const friendMenu = document.getElementById('friend-context-menu');
    const serverMenu = document.getElementById('server-context-menu');

    if (serverRow && serverMenu) {
        e.preventDefault();
        if (friendMenu) friendMenu.style.display = 'none';

        const roomId = serverRow.dataset.roomId;
        activeContextServer = window.activeRooms.find(r => r.id === roomId) || {
            id: roomId,
            name: serverRow.querySelector('.group-card-title')?.innerText || 'Group Chat',
            desc: serverRow.querySelector('.group-card-desc')?.innerText || ''
        };

        const muteItem = serverMenu.querySelector('[onclick*="mute"]');
        if (muteItem) {
            muteItem.innerText = window.mutedServers.includes(activeContextServer.id) ? 'Unmute Server' : 'Mute Server';
        }

        serverMenu.style.display = 'block';
        const maxLeft = window.innerWidth - serverMenu.offsetWidth - 12;
        const maxTop = window.innerHeight - serverMenu.offsetHeight - 12;
        serverMenu.style.left = `${Math.max(8, Math.min(e.pageX, maxLeft))}px`;
        serverMenu.style.top = `${Math.max(8, Math.min(e.pageY, maxTop))}px`;
    } else if (friendRow && friendMenu) {
        e.preventDefault();
        if (serverMenu) serverMenu.style.display = 'none';

        activeContextFriend = friendRow.dataset.username || 'Friend';
        friendMenu.style.display = 'block';
        const maxLeft = window.innerWidth - friendMenu.offsetWidth - 12;
        const maxTop = window.innerHeight - friendMenu.offsetHeight - 12;
        friendMenu.style.left = `${Math.max(8, Math.min(e.pageX, maxLeft))}px`;
        friendMenu.style.top = `${Math.max(8, Math.min(e.pageY, maxTop))}px`;
    } else {
        if (friendMenu) friendMenu.style.display = 'none';
        if (serverMenu) serverMenu.style.display = 'none';
    }
});

document.addEventListener('click', (e) => {
    const friendMenu = document.getElementById('friend-context-menu');
    const serverMenu = document.getElementById('server-context-menu');
    if (friendMenu && !e.target.closest('#friend-context-menu')) {
        friendMenu.style.display = 'none';
    }
    if (serverMenu && !e.target.closest('#server-context-menu')) {
        serverMenu.style.display = 'none';
    }
});

window.executeContextAction = function(action) {
    const friendMenu = document.getElementById('friend-context-menu');
    if (friendMenu) friendMenu.style.display = 'none';
    if (!activeContextFriend) return;

    const friendObj = window.friendsList.find(f => f.name === activeContextFriend);

    switch (action) {
        case 'report':
            alert(`Reported @${activeContextFriend} to HubPipe safety.`);
            break;
        case 'block':
            window.friendsList = window.friendsList.filter(f => f.name !== activeContextFriend);
            saveAppState();
            window.renderHubState();
            alert(`Blocked @${activeContextFriend}.`);
            break;
        case 'nickname': {
            const nick = prompt(`Enter nickname for @${activeContextFriend}:`, friendObj?.nickname || '');
            if (nick !== null && friendObj) {
                friendObj.nickname = nick.trim();
                saveAppState();
                window.renderHubState();
            }
            break;
        }
        case 'pin': {
            if (friendObj) {
                window.friendsList = [friendObj, ...window.friendsList.filter(f => f.name !== activeContextFriend)];
                saveAppState();
                window.renderHubState();
            }
            break;
        }
        case 'invite':
            alert(`Invited @${activeContextFriend} to the active group chat.`);
            break;
        case 'ignore':
            alert(`Ignored messages from @${activeContextFriend}.`);
            break;
        case 'mute':
            alert(`Muted notifications from @${activeContextFriend}.`);
            break;
    }

    activeContextFriend = null;
};

window.executeServerContextAction = function(action) {
    const serverMenu = document.getElementById('server-context-menu');
    if (serverMenu) serverMenu.style.display = 'none';
    if (!activeContextServer) return;

    const target = activeContextServer;

    switch (action) {
        case 'invite': {
            const inviteCode = target.id.replace(/^observable-group-/, '');
            const inviteLink = `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(inviteCode)}`;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(inviteLink).catch(() => {});
            }
            alert(`Invite link for "${target.name}" copied to clipboard:\n${inviteLink}`);
            break;
        }
        case 'mark-read':
            window.renderHubState();
            break;
        case 'mute': {
            const idx = window.mutedServers.indexOf(target.id);
            if (idx === -1) {
                window.mutedServers.push(target.id);
                alert(`Muted "${target.name}".`);
            } else {
                window.mutedServers.splice(idx, 1);
                alert(`Unmuted "${target.name}".`);
            }
            localStorage.setItem('hubpipe_muted_servers', JSON.stringify(window.mutedServers));
            break;
        }
        case 'edit': {
            const updatedName = prompt('New Group Chat Name:', target.name);
            if (updatedName && updatedName.trim()) {
                target.name = updatedName.trim();
            }
            const updatedDesc = prompt('New Group Chat Description:', target.desc);
            if (updatedDesc !== null) {
                target.desc = updatedDesc.trim() || 'Hello this is a Group Chat Description!';
            }
            if (window.currentRoomId === target.id) {
                document.getElementById('current-room-title').innerText = target.name;
                document.getElementById('current-room-desc').innerText = target.desc;
            }
            saveAppState();
            window.renderHubState();
            window.renderDiscoverCards();
            break;
        }
        case 'leave': {
            if (!confirm(`Leave "${target.name}"?`)) break;
            window.activeRooms = window.activeRooms.filter(r => r.id !== target.id);
            saveAppState();
            if (window.currentRoomId === target.id) {
                window.openHubView();
            }
            window.renderHubState();
            break;
        }
    }

    activeContextServer = null;
};