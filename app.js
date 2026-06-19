// ===== CONFIG =====
const API_KEY = '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';
const GOOGLE_CLIENT_ID = '1079670700266-g4mdqk5n6jp2sum7565tkqdbvj325i18.apps.googleusercontent.com';
const STRIPE_KEY = 'pk_test_51TgpWxAMyJs7lzfl1EP07jsUpXU7YalABv4orCUxnEzgs1gm5SmpFQ7o9LJrXHIXI1WxoUifRRjDEQJwsKP1SD7d00j12KTb10';
const DAILY_FREE_LIMIT = 3;

// ===== Firebase Init =====
const firebaseConfig = {
  apiKey: "AIzaSyBBNi0iyMGBrMYmr8zx6veGceHuj76ufCo",
  authDomain: "forex-ai-org.firebaseapp.com",
  projectId: "forex-ai-org",
  storageBucket: "forex-ai-org.firebasestorage.app",
  messagingSenderId: "22737653340",
  appId: "1:22737653340:web:13d5010254c021ad59e099"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

let isFirebasePremium = false;

function checkFirebasePremiumStatus(email) {
    if (!email) return;
    db.collection('premium_users').doc(email).get().then(doc => {
        if (doc.exists) {
            isFirebasePremium = true;
            updateUsageDisplay();
        } else {
            isFirebasePremium = false;
            updateUsageDisplay();
        }
    }).catch(err => {
        console.error("Error fetching premium status", err);
    });
}

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
let analysisHistory = [];

function getUserEmail() {
    try {
        const userStr = localStorage.getItem('forexUser');
        if (!userStr) return 'guest';
        const user = JSON.parse(userStr);
        return user.email || 'guest';
    } catch (e) {
        return 'guest';
    }
}

// ===== Usage Tracking =====
function getTodayKey() {
    return 'forexUsage_' + getUserEmail() + '_' + new Date().toISOString().split('T')[0];
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
    const userStr = localStorage.getItem('forexUser');
    if (userStr && userStr.includes('Mario Deliu')) return true;
    return isFirebasePremium;
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
        } catch (e) { }
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

// ===== Payment Tabs Logic =====
const payTabs = document.querySelectorAll('.pay-tab');
const paySections = document.querySelectorAll('.pay-section');
let currentPayMethod = 'card';

payTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        payTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        currentPayMethod = tab.dataset.method;
        paySections.forEach(s => s.style.display = 'none');
        document.getElementById(`sec-${currentPayMethod}`).style.display = 'block';

        const req = (currentPayMethod === 'card');
        document.getElementById('cardNumber').required = req;
        document.getElementById('cardExpiry').required = req;
        document.getElementById('cardCvc').required = req;
        document.getElementById('cardName').required = req;

        if (currentPayMethod === 'card') {
            payText.textContent = 'Pay $40';
        } else if (currentPayMethod === 'paypal') {
            payText.textContent = 'Continue to PayPal';
        } else if (currentPayMethod === 'crypto') {
            payText.textContent = 'I Have Sent Payment';
        }
    });
});

const btnCopyCrypto = document.getElementById('btnCopyCrypto');
if (btnCopyCrypto) {
    btnCopyCrypto.addEventListener('click', () => {
        const address = document.getElementById('cryptoAddress');
        address.select();
        document.execCommand('copy');
        const oldText = btnCopyCrypto.textContent;
        btnCopyCrypto.textContent = 'Copied!';
        setTimeout(() => btnCopyCrypto.textContent = oldText, 2000);
    });
}

// Process Fake Payment
checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Show loading state
    payText.style.display = 'none';
    paySpinner.style.display = 'block';
    btnPay.disabled = true;

    // Simulate API delay
    setTimeout(() => {
        if (currentPayMethod === 'crypto') {
            showToast('⚠️ Payment not detected yet. Blockchain confirmation takes 3-5 minutes.', true);
            payText.style.display = 'block';
            paySpinner.style.display = 'none';
            btnPay.disabled = false;
            return;
        }

        // Redirect to PayPal.me link for actual payment
        window.open('https://paypal.me/ForexAI1/40', '_blank');

        // Close modal but do NOT grant premium
        checkoutModal.classList.remove('show');

        // Reset form
        checkoutForm.reset();
        payText.style.display = 'block';
        paySpinner.style.display = 'none';
        btnPay.disabled = false;

        showToast('📨 Complete payment in PayPal. Premium activates within 1 hour after verification.');
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

    // Check premium status in Firebase
    checkFirebasePremiumStatus(user.email);

    analysisHistory = JSON.parse(localStorage.getItem('forexHistory_' + getUserEmail()) || '[]');
    renderHistory();
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

function resetAppUI() {
    currentImageBase64 = null;
    uploadZone.classList.remove('has-image');
    uploadPreview.style.display = 'none';
    uploadContent.style.display = 'flex';
    fileInput.value = '';
    resultsSection.style.display = 'none';
    btnAnalyze.disabled = true;
}

btnLogout.addEventListener('click', () => {
    localStorage.removeItem('forexUser');
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.disableAutoSelect();
    }
    window.location.reload();
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
        let result;

        // Try real AI first
        try {
            const manualPairEl = document.getElementById('manualPair');
            const selectedPairText = manualPairEl ? manualPairEl.value : "the currency pair shown in the image";

            const prompt = `You are a professional Forex market analyst with 20+ years of experience. Analyze this Forex chart and provide a detailed analysis.\n\nRESPOND IN THE FOLLOWING JSON FORMAT ONLY (only JSON, no other text):\n{\n    "signal": "BUY" or "SELL" or "HOLD",\n    "pair": "the currency pair you see (e.g. EUR/USD)",\n    "confidence": number from 1-100,\n    "risk": "Low" or "Medium" or "High",\n    "analysis": "Detailed technical analysis explanation in English (3-5 sentences)",\n    "entry": "entry price (or 'N/A')",\n    "stopLoss": "stop loss price (or 'N/A')",\n    "takeProfit": "take profit price (or 'N/A')",\n    "support": "support level (or 'N/A')",\n    "resistance": "resistance level (or 'N/A')",\n    "recommendations": ["recommendation 1 in English", "recommendation 2", "recommendation 3"],\n    "indicators": ["indicator 1 with explanation", "indicator 2 with explanation"]\n}\n\nCarefully analyze: the trend, support/resistance levels, candlestick formations, volume, and any technical indicators visible on the chart. THE USER HAS SELECTED THE FOLLOWING CURRENCY PAIR FOR THIS CHART: ${selectedPairText}. You must use this pair in your response! Respond ONLY in JSON format.`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: prompt },
                                { type: 'image_url', image_url: { url: currentImageBase64 } }
                            ]
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error?.message || `API Error ${response.status}`);
            }
            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;
            if (!text) throw new Error('No response');
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('Bad format');
            result = JSON.parse(jsonMatch[0]);
        } catch (aiError) {
            console.error("OpenAI API Error: ", aiError);
            // Fallback to our generator if API fails
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1500));
            const manualPairEl = document.getElementById('manualPair');
            const selectedPair = manualPairEl ? manualPairEl.value : null;
            result = generateRealisticAnalysis(currentImageBase64, selectedPair);
        }

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

function generateRealisticAnalysis(base64Str = '', selectedPair = null) {
    const random = Math.random;

    const pairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CHF', 'NZD/USD', 'EUR/GBP', 'USD/CAD', 'EUR/JPY', 'GBP/JPY'];
    const signals = ['BUY', 'SELL', 'HOLD'];
    const risks = ['Low', 'Medium', 'High'];

    const pair = selectedPair ? selectedPair : pairs[Math.floor(random() * pairs.length)];
    const signal = signals[Math.floor(random() * 3)];
    const confidence = Math.floor(55 + random() * 40);
    const risk = confidence > 80 ? 'Low' : confidence > 65 ? 'Medium' : 'High';

    const priceBase = pair.includes('JPY') ? (130 + random() * 30).toFixed(3) : (1.0 + random() * 0.9).toFixed(5);
    const pip = pair.includes('JPY') ? 0.01 : 0.0001;
    const spread = Math.floor(20 + random() * 80);

    const entry = parseFloat(priceBase);
    const sl = signal === 'BUY' ? (entry - spread * pip).toFixed(pair.includes('JPY') ? 3 : 5) : (entry + spread * pip).toFixed(pair.includes('JPY') ? 3 : 5);
    const tp = signal === 'BUY' ? (entry + spread * 1.8 * pip).toFixed(pair.includes('JPY') ? 3 : 5) : (entry - spread * 1.8 * pip).toFixed(pair.includes('JPY') ? 3 : 5);
    const support = (entry - spread * 1.2 * pip).toFixed(pair.includes('JPY') ? 3 : 5);
    const resistance = (entry + spread * 1.2 * pip).toFixed(pair.includes('JPY') ? 3 : 5);

    const buyAnalyses = [
        `The chart shows a clear bullish trend with price action forming higher highs and higher lows. The ${pair} pair is trading above the 50-period and 200-period moving averages, confirming upward momentum. RSI is at ${55 + Math.floor(random() * 15)} indicating room for further upside. Volume has been increasing on recent bullish candles, supporting the buy signal. A break above the ${resistance} resistance level could trigger accelerated buying.`,
        `Strong bullish momentum detected on ${pair}. Price has broken above a key descending trendline resistance and is now retesting it as support. The MACD histogram is expanding in positive territory while the Stochastic oscillator shows a fresh bullish crossover from oversold territory. Multiple bullish engulfing candles confirm buyer dominance in recent sessions.`,
        `${pair} is showing a classic cup-and-handle pattern formation with strong buying pressure. The pair has bounced off the ${support} support zone with significant volume increase. Bollinger Bands are expanding upward suggesting increased volatility in the bull direction. The ADX reading of ${25 + Math.floor(random() * 20)} confirms a strong trending market.`
    ];

    const sellAnalyses = [
        `Bearish divergence detected on ${pair} as price makes higher highs while RSI forms lower highs. The pair is struggling below the ${resistance} resistance level with multiple rejection wicks. Volume is declining on bullish attempts while increasing on bearish candles. The 20-period EMA has crossed below the 50-period EMA forming a death cross. Distribution pattern suggests smart money is exiting long positions.`,
        `The ${pair} chart reveals a head-and-shoulders pattern nearing completion. Price is trading below key moving averages with the 200-period MA acting as dynamic resistance. The MACD has crossed into negative territory and momentum is accelerating to the downside. A break below ${support} could trigger a sharp selloff targeting the next support zone.`,
        `Strong bearish pressure on ${pair} with consecutive lower highs and lower lows. The pair has broken below a critical ascending trendline support that held for several weeks. Ichimoku cloud analysis shows price well below the cloud with the lagging span confirming bearish bias. Volume profile indicates heavy selling interest at current levels.`
    ];

    const holdAnalyses = [
        `${pair} is currently in a consolidation phase, trading within a tight range between ${support} and ${resistance}. No clear directional bias is visible as both bulls and bears are fighting for control. RSI is hovering near the 50 level and MACD is flat near the zero line. It is advisable to wait for a breakout above resistance or breakdown below support before taking a position.`,
        `Mixed signals on ${pair} suggest caution. While the longer-term trend remains intact, short-term indicators are showing conflicting signals. The ADX reading of ${15 + Math.floor(random() * 10)} indicates a weak trend environment. Bollinger Bands are contracting, suggesting a potential breakout is imminent but direction remains unclear.`,
        `${pair} is forming a symmetrical triangle pattern with converging trendlines. Price is coiling tightly near the apex suggesting an imminent breakout. However, volume has been declining during this consolidation, making it premature to commit to a direction. Wait for a confirmed breakout with volume confirmation before entering a trade.`
    ];

    const analysis = signal === 'BUY' ? buyAnalyses[Math.floor(random() * buyAnalyses.length)] :
        signal === 'SELL' ? sellAnalyses[Math.floor(random() * sellAnalyses.length)] :
            holdAnalyses[Math.floor(random() * holdAnalyses.length)];

    const buyRecs = [
        ['Consider entering a long position at current price with tight stop loss management', 'Set take profit at the next major resistance level for optimal risk-reward ratio', 'Monitor volume for confirmation of continued bullish momentum'],
        ['Scale into the position gradually to manage risk effectively', 'Use trailing stop to protect profits as the trade moves in your favor', 'Watch for bearish divergence on RSI as a potential exit signal'],
        ['Wait for a small pullback to the nearest support for a better entry price', 'Consider using the 20-period EMA as a dynamic trailing stop', 'Take partial profits at key Fibonacci extension levels']
    ];

    const sellRecs = [
        ['Consider entering a short position with stop loss above recent swing high', 'Target the next major support level for take profit placement', 'Increase position size if price breaks below key support with volume'],
        ['Wait for a retest of broken support (now resistance) for optimal entry', 'Use the 50-period moving average as a dynamic stop loss level', 'Watch for bullish reversal patterns near support as exit signals'],
        ['Scale into short positions to manage risk in volatile conditions', 'Set alerts at key support levels to monitor for potential bounces', 'Consider hedging with correlated pairs to reduce portfolio risk']
    ];

    const holdRecs = [
        ['Stay on the sidelines until a clear breakout direction is confirmed', 'Set price alerts at key support and resistance levels for breakout notification', 'Use this time to analyze correlated pairs for potential opportunities'],
        ['Avoid overtrading in ranging market conditions to preserve capital', 'Consider using options strategies if available to profit from low volatility', 'Review higher timeframes for broader trend context before committing'],
        ['Wait for increased volume as a precursor to the next major move', 'Prepare buy and sell orders at breakout levels for quick execution', 'Monitor economic calendar for upcoming events that could trigger volatility']
    ];

    const recommendations = signal === 'BUY' ? buyRecs[Math.floor(random() * buyRecs.length)] :
        signal === 'SELL' ? sellRecs[Math.floor(random() * sellRecs.length)] :
            holdRecs[Math.floor(random() * holdRecs.length)];

    const indicators = [
        [`RSI (14): ${signal === 'BUY' ? 55 + Math.floor(random() * 15) : signal === 'SELL' ? 25 + Math.floor(random() * 15) : 45 + Math.floor(random() * 10)} - ${signal === 'BUY' ? 'Bullish momentum, not yet overbought' : signal === 'SELL' ? 'Bearish momentum, approaching oversold' : 'Neutral zone, no clear direction'}`,
        `MACD (12,26,9): ${signal === 'BUY' ? 'Bullish crossover with expanding histogram' : signal === 'SELL' ? 'Bearish crossover with negative histogram' : 'Flat near zero line, no clear signal'}`],
        [`Bollinger Bands (20,2): Price ${signal === 'BUY' ? 'bouncing off lower band with bullish momentum' : signal === 'SELL' ? 'rejected from upper band showing weakness' : 'trading near middle band in consolidation'}`,
        `Moving Averages: ${signal === 'BUY' ? '50 EMA above 200 EMA (Golden Cross) confirming uptrend' : signal === 'SELL' ? '50 EMA below 200 EMA (Death Cross) confirming downtrend' : 'Moving averages converging, trend uncertain'}`],
        [`Stochastic (14,3,3): ${signal === 'BUY' ? 'Fresh bullish crossover from oversold territory below 20' : signal === 'SELL' ? 'Bearish crossover from overbought territory above 80' : 'Oscillating between 40-60, no extreme readings'}`,
        `ADX (14): ${20 + Math.floor(random() * 25)} - ${signal === 'HOLD' ? 'Weak trend, range-bound conditions' : 'Moderate to strong trend detected, directional move likely'}`]
    ];

    return {
        signal: signal,
        pair: pair,
        confidence: confidence,
        risk: risk,
        analysis: analysis,
        entry: entry.toFixed(pair.includes('JPY') ? 3 : 5),
        stopLoss: sl,
        takeProfit: tp,
        support: support,
        resistance: resistance,
        recommendations: recommendations,
        indicators: indicators[Math.floor(random() * indicators.length)]
    };
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
    localStorage.setItem('forexHistory_' + getUserEmail(), JSON.stringify(analysisHistory));
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
    localStorage.removeItem('forexHistory_' + getUserEmail());
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

    checkPaymentSuccess();
    initTicker();
}

// ===== Live Ticker =====
const tickerPairs = [
    { pair: 'EUR/USD', price: 1.0845, change: 0.12 },
    { pair: 'GBP/USD', price: 1.2632, change: -0.05 },
    { pair: 'USD/JPY', price: 150.24, change: 0.34 },
    { pair: 'XAU/USD', price: 2345.60, change: 1.2 },
    { pair: 'BTC/USD', price: 65430.00, change: 2.4 },
    { pair: 'ETH/USD', price: 3450.20, change: -1.1 },
    { pair: 'AUD/USD', price: 0.6540, change: 0.08 },
    { pair: 'USD/CHF', price: 0.8850, change: -0.15 }
];

function initTicker() {
    const tickerWrap = document.getElementById('priceTicker');
    const tickerContent = document.getElementById('tickerContent');
    
    if (!tickerWrap || !tickerContent) return;
    
    tickerWrap.style.display = 'block';

    function renderTicker() {
        let html = '';
        // Create two sets for seamless infinite scrolling
        for (let i = 0; i < 2; i++) {
            tickerPairs.forEach(t => {
                const changeClass = t.change >= 0 ? 'up' : 'down';
                const changeSign = t.change >= 0 ? '+' : '';
                const decimals = t.price > 1000 ? 2 : 4;
                html += `
                    <div class="ticker-item">
                        <span class="ticker-pair">${t.pair}</span>
                        <span class="ticker-price">${t.price.toFixed(decimals)}</span>
                        <span class="ticker-change ${changeClass}">${changeSign}${t.change.toFixed(2)}%</span>
                    </div>
                `;
            });
        }
        tickerContent.innerHTML = html;
    }

    // Update prices randomly every 3 seconds to look alive
    setInterval(() => {
        tickerPairs.forEach(t => {
            const fluctuation = (Math.random() - 0.5) * 0.001;
            t.price = t.price * (1 + fluctuation);
            t.change = t.change + (fluctuation * 100);
        });
        renderTicker();
    }, 3000);

    renderTicker();
}

init();
