// ===== CONFIG =====
const API_KEY = AQ.Ab8RN6JadOvP3B-edI3uF26W1pUIrk8jtXd0UB2WsqjZKPGKpw;
const GOOGLE_CLIENT_ID = '1079670700266-g4mdqk5n6jp2sum7565tkqdbvj325i18.apps.googleusercontent.com';
const STRIPE_KEY = 'pk_test_51TgpWxAMyJs7lzfl1EP07jsUpXU7YalABv4orCUxnEzgs1gm5SmpFQ7o9LJrXHIXI1WxoUifRRjDEQJwsKP1SD7d00j12KTb10';
const DAILY_FREE_LIMIT = 3;

// ===== Stripe Init =====
const stripe = Stripe(STRIPE_KEY);

// ===== DOM Elements =====
const loginScreen = document.getElementById('loginScreen');
const appHeader = document.getElementById('appHeader');
const appMain = document.getElementById('appMain');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const btnLogout = document.getElementById('btnLogout');
const uploadZone = document.getElementById('uploadZone');
const uploadContent = document.getElementById('uploadContent');
const uploadPreview = document.getElementById('uploadPreview');
const previewImg = document.getElementById('previewImg');
const fileInput = document.getElementById('fileInput');
const btnRemove = document.getElementById('btnRemove');
const btnAnalyze = document.getElementById('btnAnalyze');
const resultsSection = document.getElementById('resultsSection');
const historySection = document.getElementById('historySection');
const historyList = document.getElementById('historyList');
const btnClearHistory = document.getElementById('btnClearHistory');
const pricingModal = document.getElementById('pricingModal');
const pricingClose = document.getElementById('pricingClose');
const btnPricing = document.getElementById('btnPricing');
const btnUpgrade = document.getElementById('btnUpgrade');
const planBadge = document.getElementById('planBadge');
const usageCounter = document.getElementById('usageCounter');
const usageText = document.getElementById('usageText');

let currentImageBase64 = null;
let analysisHistory = JSON.parse(localStorage.getItem('forexHistory') || '[]');

// ===== Usage Tracking =====
function getTodayKey() {
    return 'forexUsage_' + new Date().toISOString().split('T')[0];
}

function getUsageToday() {
    return parseInt(localStorage.getItem(getTodayKey()) || '0');
}

function incrementUsage() {
    const key = getTodayKey();
    const current = getUsageToday();
    localStorage.setItem(key, (current + 1).toString());
    updateUsageDisplay();
}

function isPremium() {
    return localStorage.getItem('forexPremium') === 'true';
}

function canAnalyze() {
    if (isPremium()) return true;
    return getUsageToday() < DAILY_FREE_LIMIT;
}

function getRemainingAnalyses() {
    if (isPremium()) return '∞';
    return Math.max(0, DAILY_FREE_LIMIT - getUsageToday());
}

function updateUsageDisplay() {
    const remaining = getRemainingAnalyses();
    
    if (isPremium()) {
        planBadge.textContent = 'Premium';
        planBadge.className = 'plan-badge premium';
        usageText.textContent = 'Unlimited';
        usageCounter.className = 'usage-counter';
    } else {
        planBadge.textContent = 'Free';
        planBadge.className = 'plan-badge free';
        usageText.textContent = `${remaining}/${DAILY_FREE_LIMIT} left`;
        
        if (remaining === 0) {
            usageCounter.className = 'usage-counter empty';
        } else if (remaining === 1) {
            usageCounter.className = 'usage-counter low';
        } else {
            usageCounter.className = 'usage-counter';
        }
    }
}

// ===== Pricing Modal =====
btnPricing.addEventListener('click', () => {
    pricingModal.classList.add('show');
});

pricingClose.addEventListener('click', () => {
    pricingModal.classList.remove('show');
});

pricingModal.addEventListener('click', (e) => {
    if (e.target === pricingModal) pricingModal.classList.remove('show');
});

btnUpgrade.addEventListener('click', () => {
    pricingModal.classList.remove('show');
    
    // Auto-fill email if user is logged in
    const savedUser = localStorage.getItem('forexUser');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            document.getElementById('checkoutEmail').value = user.email || '';
        } catch(e) {}
    }
    
    document.getElementById('checkoutModal').classList.add('show');
});

// ===== Checkout Modal & Fake Payment Logic =====
const checkoutModal = document.getElementById('checkoutModal');
const checkoutClose = document.getElementById('checkoutClose');
const checkoutForm = document.getElementById('checkoutForm');
const cardNumber = document.getElementById('cardNumber');
const cardExpiry = document.getElementById('cardExpiry');
const btnPay = document.getElementById('btnPay');
const payText = btnPay.querySelector('.pay-text');
const paySpinner = btnPay.querySelector('.pay-spinner');

checkoutClose.addEventListener('click', () => {
    checkoutModal.classList.remove('show');
});

checkoutModal.addEventListener('click', (e) => {
    if (e.target === checkoutModal) checkoutModal.classList.remove('show');
});

// Format Card Number (add spaces)
cardNumber.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '');
    let formatted = '';
    for (let i = 0; i < val.length; i++) {
        if (i > 0 && i % 4 === 0) formatted += ' ';
        formatted += val[i];
    }
    e.target.value = formatted;
});

// Format Expiry Date (MM / YY)
cardExpiry.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length >= 2) {
        val = val.substring(0, 2) + ' / ' + val.substring(2, 4);
    }
    e.target.value = val;
});

// Process Fake Payment
checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Show loading state
    payText.style.display = 'none';
    paySpinner.style.display = 'block';
    btnPay.disabled = true;
    
    // Simulate API delay
    setTimeout(() => {
        // Redirect to PayPal.me link
        window.open('https://paypal.me/mario12944/40', '_blank');
        
        // Success
        localStorage.setItem('forexPremium', 'true');
        updateUsageDisplay();
        checkoutModal.classList.remove('show');
        
        // Reset form
        checkoutForm.reset();
        payText.style.display = 'block';
        paySpinner.style.display = 'none';
        btnPay.disabled = false;
        
        showToast('🎉 Duke hapur PayPal... Llogaria po bëhet Premium!');
    }, 1500);
});

// Check URL for successful payment return (if using real gateway later)
function checkPaymentSuccess() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
        localStorage.setItem('forexPremium', 'true');
        updateUsageDisplay();
        showToast('🎉 Payment successful! Welcome to Premium!');
        window.history.replaceState({}, '', window.location.pathname);
    }
}

// ===== Google Sign-In =====
function handleCredentialResponse(response) {
    const payload = parseJwt(response.credential);
    
    if (payload) {
        localStorage.setItem('forexUser', JSON.stringify({
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
            token: response.credential
        }));

        showApp(payload);
    }
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

function showApp(user) {
    loginScreen.classList.add('hidden');
    setTimeout(() => {
        loginScreen.style.display = 'none';
    }, 500);
    appHeader.style.display = 'block';
    appMain.style.display = 'block';

    userAvatar.src = user.picture || '';
    userName.textContent = user.name || user.email || 'User';
    
    updateUsageDisplay();
}

function showLogin() {
    loginScreen.style.display = 'flex';
    loginScreen.classList.remove('hidden');
    appHeader.style.display = 'none';
    appMain.style.display = 'none';
    initGoogleSignIn();
}

function initGoogleSignIn() {
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse
        });

        google.accounts.id.renderButton(
            document.getElementById('googleSignInBtn'),
            { 
                theme: 'filled_black',
                size: 'large',
                shape: 'pill',
                text: 'signin_with',
                width: 280
            }
        );
    } else {
        setTimeout(initGoogleSignIn, 500);
    }
}

btnLogout.addEventListener('click', () => {
    localStorage.removeItem('forexUser');
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.disableAutoSelect();
    }
    showLogin();
    showToast('Signed out successfully! 👋');
});

// ===== File Upload =====
uploadZone.addEventListener('click', (e) => {
    if (e.target === btnRemove || e.target.closest('.btn-remove')) return;
    if (!uploadZone.classList.contains('has-image')) {
        fileInput.click();
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragging');
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragging');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragging');
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Please upload images only! ⚠️');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showToast('Image is too large (max 10MB)! ⚠️');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        currentImageBase64 = e.target.result;
        previewImg.src = currentImageBase64;
        uploadContent.style.display = 'none';
        uploadPreview.style.display = 'block';
        uploadZone.classList.add('has-image');
        updateAnalyzeButton();
    };
    reader.readAsDataURL(file);
}

btnRemove.addEventListener('click', (e) => {
    e.stopPropagation();
    removeImage();
});

function removeImage() {
    currentImageBase64 = null;
    fileInput.value = '';
    uploadContent.style.display = 'flex';
    uploadPreview.style.display = 'none';
    uploadZone.classList.remove('has-image');
    updateAnalyzeButton();
}

function updateAnalyzeButton() {
    btnAnalyze.disabled = !currentImageBase64;
}

// ===== Analysis =====
btnAnalyze.addEventListener('click', analyzeChart);

async function analyzeChart() {
    if (!currentImageBase64) return;

    // Check usage limit
    if (!canAnalyze()) {
        pricingModal.classList.add('show');
        showToast('Daily free limit reached. Upgrade to Premium for unlimited analyses!', true);
        return;
    }

    const btnText = btnAnalyze.querySelector('.btn-text');
    const btnLoading = btnAnalyze.querySelector('.btn-loading');
    btnText.style.display = 'none';
    btnLoading.style.display = 'flex';
    btnAnalyze.disabled = true;

    try {
        const base64Data = currentImageBase64.split(',')[1];
        const mimeType = currentImageBase64.split(';')[0].split(':')[1];

        const prompt = `You are a professional Forex market analyst with 20+ years of experience. Analyze this Forex chart and provide a detailed analysis.

RESPOND IN THE FOLLOWING JSON FORMAT ONLY (only JSON, no other text):
{
    "signal": "BUY" or "SELL" or "HOLD",
    "pair": "the currency pair you see (e.g. EUR/USD)",
    "confidence": number from 1-100,
    "risk": "Low" or "Medium" or "High",
    "analysis": "Detailed technical analysis explanation in English (3-5 sentences)",
    "entry": "entry price (or 'N/A')",
    "stopLoss": "stop loss price (or 'N/A')",
    "takeProfit": "take profit price (or 'N/A')",
    "support": "support level (or 'N/A')",
    "resistance": "resistance level (or 'N/A')",
    "recommendations": ["recommendation 1 in English", "recommendation 2", "recommendation 3"],
    "indicators": ["indicator 1 with explanation", "indicator 2 with explanation"]
}

Carefully analyze: the trend, support/resistance levels, candlestick formations, volume, and any technical indicators visible on the chart. Respond ONLY in JSON format.`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            {
                                inline_data: {
                                    mime_type: mimeType,
                                    data: base64Data
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 2048
                    }
                })
            }
        );

        if (!response.ok) {
            const errData = await response.json().catch(() => null);
            throw new Error(errData?.error?.message || `Error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error('No response received from AI.');

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Response format is not correct.');

        const result = JSON.parse(jsonMatch[0]);
        
        // Increment usage after successful analysis
        incrementUsage();
        
        displayResults(result);
        saveToHistory(result);

    } catch (err) {
        showToast(`Error: ${err.message}`, true);
        console.error('Analysis error:', err);
    } finally {
        btnText.style.display = 'flex';
        btnLoading.style.display = 'none';
        btnAnalyze.disabled = false;
        updateAnalyzeButton();
    }
}

// ===== Display Results =====
function displayResults(result) {
    const signalCard = document.getElementById('signalCard');
    const signalBadge = document.getElementById('signalBadge');
    const signalPair = document.getElementById('signalPair');
    const confidenceFill = document.getElementById('confidenceFill');
    const confidenceValue = document.getElementById('confidenceValue');
    const riskValue = document.getElementById('riskValue');
    const analysisText = document.getElementById('analysisText');
    const levelsGrid = document.getElementById('levelsGrid');
    const recommendationsText = document.getElementById('recommendationsText');
    const resultsTime = document.getElementById('resultsTime');

    const signal = (result.signal || 'HOLD').toUpperCase();
    let signalClass = 'hold';
    if (signal.includes('BUY')) signalClass = 'buy';
    else if (signal.includes('SELL')) signalClass = 'sell';

    signalCard.className = `signal-card ${signalClass}`;
    signalBadge.textContent = signal;
    signalPair.textContent = result.pair || 'N/A';

    const conf = Math.min(100, Math.max(0, parseInt(result.confidence) || 50));
    confidenceValue.textContent = `${conf}%`;

    const risk = (result.risk || 'Medium').toLowerCase();
    riskValue.textContent = result.risk || 'Medium';
    riskValue.className = 'metric-value risk-badge';
    if (risk.includes('low')) riskValue.classList.add('low');
    else if (risk.includes('high')) riskValue.classList.add('high');
    else riskValue.classList.add('medium');

    let analysisHTML = `<p>${result.analysis || 'No analysis available.'}</p>`;
    if (result.indicators && result.indicators.length > 0) {
        analysisHTML += '<ul>';
        result.indicators.forEach(ind => {
            analysisHTML += `<li>${ind}</li>`;
        });
        analysisHTML += '</ul>';
    }
    analysisText.innerHTML = analysisHTML;

    const levels = [
        { label: 'Entry', value: result.entry, cls: 'blue' },
        { label: 'Stop Loss', value: result.stopLoss, cls: 'red' },
        { label: 'Take Profit', value: result.takeProfit, cls: 'green' },
        { label: 'Support', value: result.support, cls: 'blue' },
        { label: 'Resistance', value: result.resistance, cls: 'red' }
    ].filter(l => l.value && l.value !== 'N/A');

    levelsGrid.innerHTML = levels.map(l => `
        <div class="level-item">
            <span class="level-label">${l.label}</span>
            <span class="level-value ${l.cls}">${l.value}</span>
        </div>
    `).join('');

    if (levels.length === 0) {
        levelsGrid.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">No specific levels identified.</p>';
    }

    if (result.recommendations && result.recommendations.length > 0) {
        recommendationsText.innerHTML = '<ul>' + 
            result.recommendations.map(r => `<li>${r}</li>`).join('') +
            '</ul>';
    } else {
        recommendationsText.innerHTML = '<p>No additional recommendations.</p>';
    }

    resultsTime.textContent = new Date().toLocaleString('en-US');

    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    confidenceFill.style.width = '0%';
    setTimeout(() => {
        confidenceFill.style.width = `${conf}%`;
    }, 200);
}

// ===== History =====
function saveToHistory(result) {
    const entry = {
        signal: result.signal || 'HOLD',
        pair: result.pair || 'N/A',
        confidence: result.confidence || 0,
        date: new Date().toISOString(),
        result: result
    };

    analysisHistory.unshift(entry);
    if (analysisHistory.length > 20) analysisHistory = analysisHistory.slice(0, 20);
    localStorage.setItem('forexHistory', JSON.stringify(analysisHistory));
    renderHistory();
}

function renderHistory() {
    if (analysisHistory.length === 0) {
        historySection.style.display = 'none';
        return;
    }

    historySection.style.display = 'block';
    historyList.innerHTML = analysisHistory.map((item, idx) => {
        const signal = (item.signal || 'HOLD').toUpperCase();
        let signalClass = 'hold';
        if (signal.includes('BUY')) signalClass = 'buy';
        else if (signal.includes('SELL')) signalClass = 'sell';

        const date = new Date(item.date);
        const dateStr = date.toLocaleDateString('en-US') + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        return `
            <div class="history-item" data-index="${idx}">
                <span class="history-signal ${signalClass}">${signal}</span>
                <div class="history-info">
                    <div class="history-pair">${item.pair}</div>
                    <div class="history-date">${dateStr}</div>
                </div>
                <span class="history-confidence">${item.confidence}%</span>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.history-item').forEach(el => {
        el.addEventListener('click', () => {
            const idx = parseInt(el.dataset.index);
            if (analysisHistory[idx]?.result) {
                displayResults(analysisHistory[idx].result);
            }
        });
    });
}

btnClearHistory.addEventListener('click', () => {
    analysisHistory = [];
    localStorage.removeItem('forexHistory');
    renderHistory();
    showToast('History cleared! 🗑️');
});

// ===== Toast Notification =====
function showToast(msg, isError = false) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        padding: 12px 24px;
        background: ${isError ? '#1a0a0e' : '#0a1a12'};
        border: 1px solid ${isError ? 'rgba(255,23,68,0.3)' : 'rgba(0,200,83,0.3)'};
        color: ${isError ? '#ff6b6b' : '#69f0ae'};
        border-radius: 12px;
        font-family: 'Inter', sans-serif;
        font-size: 0.88rem;
        z-index: 9999;
        opacity: 0;
        transition: all 0.3s ease;
        backdrop-filter: blur(12px);
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        max-width: 90%;
        text-align: center;
    `;

    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ===== Keyboard =====
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        pricingModal.classList.remove('show');
    }
});

// ===== Init =====
function init() {
    const savedUser = localStorage.getItem('forexUser');
    
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            showApp(user);
        } catch (e) {
            showLogin();
        }
    } else {
        showLogin();
    }

    renderHistory();
    checkPaymentSuccess();
}

init();
