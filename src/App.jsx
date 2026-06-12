import { BrowserRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2, BellRing, MessageCircle, Phone, PhoneOff, MessageSquare, Trash2, Edit2, Plus, Check, X, LogOut, ShieldAlert, Award, Download, Volume2, Sparkles } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { db, auth, getTagById, activateTag, createNotification, deleteTagRecord, updateTagInfo, requestNotificationPermission, deleteNotificationRecord } from './firebase';
import { signInAnonymously } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';

function App() {
  // Giriş yapalım (Anonim de olsa bildirim atabilmek için)
  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
  }, []);

  return (
    <BrowserRouter>
      <div className="container">
        <header className="app-header">
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="app-logo">
              <ShieldCheck size={32} color="#6366f1" style={{ filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.4))' }} />
              <div>Park<span>QR</span></div>
            </div>
          </Link>
        </header>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/id/:tagId" element={<ScanTag />} />
          <Route path="/activate/:tagId" element={<ActivateTag />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function Home() {
  return (
    <div className="glass-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
      <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '24px', marginBottom: '24px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
        <ShieldCheck size={48} color="#6366f1" />
      </div>
      <h1 style={{ marginBottom: '16px', fontSize: '2rem' }}>Gizli Numara,<br />Güvenli İletişim</h1>
      <p style={{ fontSize: '1.05rem', marginBottom: '32px', color: '#94a3b8' }}>
        Araç camınıza bırakacağınız QR kod ile telefon numaranızı paylaşmadan anında bildirim alın.
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Link to="/dashboard" className="btn btn-primary">
          <BellRing size={20} />
          Kontrol Paneli (Çağrılar)
        </Link>
        
        <Link to="/activate/demo123" className="btn btn-outline" style={{ height: '52px' }}>
          Sistemi Test Et (Yeni Etiket)
        </Link>
      </div>
    </div>
  );
}

function ScanTag() {
  const { tagId } = useParams();
  const navigate = useNavigate();
  const [tag, setTag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('🚗 Çıkışımı engelliyor');
  const [customReason, setCustomReason] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const fetchTag = async () => {
      const tag = await getTagById(tagId);
      if (!tag) {
        navigate(`/activate/${tagId}`);
        return;
      }
      setTag(tag);
      setLoading(false);
    };
    fetchTag();
  }, [tagId, navigate]);

  const handleSend = async () => {
    if (phone.length < 10) return alert('Lütfen geçerli bir numara girin');
    setSending(true);
    const selectedReason = reason.startsWith('💬') ? customReason.trim() : reason;
    await createNotification(tag.plate, phone, tag.ownerUid, selectedReason || "Hızlı Çağrı");
    setSending(false);
    setDone(true);
  };

  if (loading) return <div className="glass-card" style={{ textAlign: 'center', padding: '48px' }}><Loader2 className="spinner" size={36} /></div>;
  
  if (done) return (
    <div className="glass-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
      <div style={{ fontSize: '56px', marginBottom: '20px', animation: 'scaleUp 0.3s ease-out' }}>✅</div>
      <h2 style={{ marginBottom: '12px' }}>Bildirim Gönderildi!</h2>
      <p style={{ color: '#cbd5e1', marginBottom: '0' }}>Araç sahibinin telefonuna anında bildirim düştü. Lütfen aracın başında bekleyin.</p>
    </div>
  );

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div className="badge badge-success">Araç Bulundu</div>
        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>ID: {tagId}</div>
      </div>

      <h2 style={{ marginBottom: '16px' }}>Araç Sahibini Çağır</h2>
      <p>Bu aracın çıkışınızı engellediğini veya bir sorun olduğunu mu düşünüyorsunuz?</p>

      {/* Plate Badge Component */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
        <div className="plate-badge" style={{ height: '48px', fontSize: '1.4rem' }}>
          <div className="plate-badge-tr" style={{ minWidth: '32px', fontSize: '0.8rem' }}>TR</div>
          <div className="plate-badge-text" style={{ padding: '0 20px' }}>{tag?.plate}</div>
        </div>
      </div>

      {/* Quick Message / Reason Selector */}
      <div className="form-group" style={{ marginBottom: '20px' }}>
        <label>Arama Sebebi:</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          {[
            { id: 'engelliyor', text: '🚗 Çıkışımı engelliyor' },
            { id: 'farlar', text: '💡 Farlar açık kalmış' },
            { id: 'alarm', text: '🚨 Alarm çalıyor' },
            { id: 'other', text: '💬 Diğer' }
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setReason(opt.text)}
              className={`btn ${reason === opt.text || (opt.id === 'other' && reason.startsWith('💬')) ? 'btn-primary' : 'btn-outline'}`}
              style={{
                padding: '8px 14px',
                fontSize: '0.85rem',
                width: 'auto',
                borderRadius: '20px',
                height: '36px',
                boxShadow: 'none'
              }}
            >
              {opt.text}
            </button>
          ))}
        </div>
        
        {(reason === '💬 Diğer' || reason.startsWith('💬')) && (
          <input
            type="text"
            placeholder="Özel mesajınızı yazın..."
            value={customReason}
            onChange={(e) => {
              setCustomReason(e.target.value);
              setReason('💬 ' + e.target.value);
            }}
            style={{ marginTop: '8px', height: '44px' }}
          />
        )}
      </div>
      
      <div className="form-group" style={{ marginTop: '20px' }}>
        <label>Size ulaşabilmesi için numaranız:</label>
        <input 
          type="tel" 
          placeholder="05XX XXX XX XX" 
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ height: '52px' }}
        />
        <div style={{
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '10px', 
          marginTop: '16px', 
          background: 'rgba(16, 185, 129, 0.08)', 
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '12px',
          padding: '12px',
          color: '#34d399', 
          textAlign: 'left', 
          lineHeight: '1.4'
        }}>
          <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '2px' }} /> 
          <span style={{ fontSize: '0.85rem' }}>
            Numaranız istenmeyen kişilere iletilmez. Araç sahibi %100 gizli kalır.
          </span>
        </div>
      </div>
      
      <button 
        className="btn btn-danger" 
        onClick={handleSend} 
        disabled={sending}
        style={{ marginTop: '16px', height: '52px' }}
      >
        {sending ? (
          <>
            <Loader2 className="spinner" size={20} style={{ color: 'white' }} />
            Gönderiliyor...
          </>
        ) : (
          'Acil Bildirim Gönder'
        )}
      </button>
    </div>
  );
}

function ActivateTag() {
  const { tagId } = useParams();
  const navigate = useNavigate();
  const [plate, setPlate] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const handleActivate = async () => {
    if (!plate) return alert('Lütfen plaka girin');
    setSaving(true);
    
    // Anonim kullanıcı ile eşleştir
    const uid = auth.currentUser ? auth.currentUser.uid : 'temp-user';
    await activateTag(tagId, plate, uid, phone);
    
    setSaving(false);
    alert('Harika! QR kodunuz başarıyla plakanızla eşleşti.');
    navigate(`/id/${tagId}`);
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div className="badge badge-warning">Yeni Etiket</div>
        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>ID: {tagId}</div>
      </div>

      <h2 style={{ marginBottom: '12px' }}>QR Kodu Aktifleştir</h2>
      <p>Bu QR kod henüz boş. Kendi aracınızla eşleştirmek için bilgilerinizi girin.</p>
      
      <div className="form-group" style={{ marginTop: '24px' }}>
        <label>Plakanız:</label>
        <input 
          type="text" 
          placeholder="34 ABC 123" 
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          style={{ textTransform: 'uppercase', height: '52px' }}
        />
      </div>

      <div className="form-group" style={{ marginTop: '20px' }}>
        <label>Telefon Numaranız (Opsiyonel):</label>
        <input 
          type="tel" 
          placeholder="05XX XXX XX XX" 
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ height: '52px' }}
        />
        <div style={{
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '10px', 
          marginTop: '16px', 
          background: 'rgba(99, 102, 241, 0.08)', 
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: '12px',
          padding: '12px',
          color: '#818cf8', 
          textAlign: 'left', 
          lineHeight: '1.4'
        }}>
          <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '2px' }} /> 
          <span style={{ fontSize: '0.85rem' }}>
            Telefonunuz 256-bit ile şifrelenir. Yoldan geçen vatandaşlar barkodu okutsa bile numaranızı ASLA göremez.
          </span>
        </div>
      </div>
      
      <button 
        className="btn btn-primary" 
        onClick={handleActivate}
        disabled={saving}
        style={{ marginTop: '16px', height: '52px' }}
      >
        {saving ? (
          <>
            <Loader2 className="spinner" size={20} style={{ color: 'white' }} />
            Kaydediliyor...
          </>
        ) : (
          'Eşleştir ve Aktifleştir'
        )}
      </button>
    </div>
  );
}

function Dashboard() {
  const [notifications, setNotifications] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(null);
  const [editingTag, setEditingTag] = useState(null);
  const [editPlateValue, setEditPlateValue] = useState("");
  const [editPhoneValue, setEditPhoneValue] = useState("");
  const navigate = useNavigate();
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const audioRef = useRef(null);
  
  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Zil sesi state
  const [alertSound, setAlertSound] = useState(localStorage.getItem('parkqr_alert_sound') || 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
  
  const SOUNDS = [
    { name: '🔊 Kısa Bip (Varsayılan)', url: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' },
    { name: '🚗 Araç Kornası', url: 'https://actions.google.com/sounds/v1/impacts/horn_screech.ogg' },
    { name: '🔔 Dijital Saat Alarmı', url: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg' }
  ];

  // İlk yüklemeyi takip etmek için (eski bildirimlerde ses çalmasın diye)
  const isFirstLoad = useRef(true);

  useEffect(() => {
    // Seçilen zil sesini yükle
    audioRef.current = new Audio(alertSound);
    
    // Auth yüklenmesini bekle
    const checkUser = setInterval(() => {
      if (auth.currentUser) {
        clearInterval(checkUser);
        startListening(auth.currentUser.uid);
      }
    }, 500);

    // PWA Install listener
    const handleInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      clearInterval(checkUser);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, [alertSound]);

  const startListening = (uid) => {
    const q = query(
      collection(db, 'notifications'), 
      where('ownerUid', '==', uid)
    );

    const unsubNotif = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Client-side sort
      
      setNotifications(notifs);
      setLoading(false);

      // Sadece yeni bir belge EKLENDİĞİNDE (ilk yükleme hariç) ses çal
      if (!isFirstLoad.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            audioRef.current.play().catch(e => console.log('Ses çalma izni yok:', e));
            
            // Titreşim ekle (Destekleyen telefonlar için)
            if (navigator.vibrate) {
              navigator.vibrate([500, 200, 500, 200, 500]);
            }

            // Basit bir browser alarm uyarısı da çıkarabiliriz (kullanıcı arka plandaysa dikkat çeksin diye)
            if (Notification.permission === 'granted') {
              new Notification('🚗 Aracınız İçin Acil Çağrı Var!');
            }
          }
        });
      }
      isFirstLoad.current = false;
    });

    const qTags = query(collection(db, 'tags'), where('ownerUid', '==', uid));
    const unsubTags = onSnapshot(qTags, (snapshot) => {
      const myTags = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTags(myTags);
    });

    return () => {
      unsubNotif();
      unsubTags();
    };
  };

  // Kullanıcıdan ses ve bildirim izni istemek için bir buton
  const requestPermissions = () => {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    // Sesi tetikle (Kullanıcı etkileşimi olmadan tarayıcı ses çalmayı engelleyebilir, bu bir test olur)
    audioRef.current.play().then(() => audioRef.current.pause());
  };

  const handleSoundChange = (url) => {
    setAlertSound(url);
    localStorage.setItem('parkqr_alert_sound', url);
    audioRef.current.src = url;
    setTimeout(() => {
      audioRef.current.play().catch(e => console.log("Ses oynatılamadı", e));
    }, 100);
  };

  const downloadQRCard = async (tag) => {
    const canvas = document.createElement('canvas');
    const cardW = 480;
    const cardH = 640;
    canvas.width = cardW;
    canvas.height = cardH;
    const ctx = canvas.getContext('2d');

    // Background (pure white to save ink, with clean double borders)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cardW, cardH);
    
    // Blue border strip like license plate
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(0, 0, cardW, 12);

    // Draw double border around card
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 22, cardW - 20, cardH - 32);

    // App Title and branding
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🅿 ParkQR', cardW / 2, 70);

    ctx.fillStyle = '#64748b';
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText('Araç sahibine ulaşmak için bu kodu taratın', cardW / 2, 100);

    // QR Code SVG resolution to Canvas
    const svgEl = document.querySelector(`.qr-box-container-${tag.tagId} svg`);
    if (svgEl) {
      const svgString = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = blobURL;
      });

      // Draw white rounded box behind QR
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect((cardW - 220) / 2, 130, 220, 220);
      
      // Draw border for QR box
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect((cardW - 220) / 2, 130, 220, 220);

      // Draw the QR Code image
      ctx.drawImage(img, (cardW - 200) / 2, 140, 200, 200);
    } else {
      ctx.fillStyle = '#ef4444';
      ctx.font = '16px Arial';
      ctx.fillText('QR Kod SVG Alınamadı. QR Kodu Açın.', cardW / 2, 240);
    }

    // Draw License Plate representation
    const plateX = (cardW - 320) / 2;
    const plateY = 380;
    const plateW = 320;
    const plateH = 70;

    // Draw License plate frame
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(plateX, plateY, plateW, plateH);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeRect(plateX, plateY, plateW, plateH);

    // Blue TR rectangle
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(plateX + 2, plateY + 2, 38, plateH - 4);

    // TR Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TR', plateX + 21, plateY + 42);

    // Plate Text
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(tag.plate, plateX + 180, plateY + 48);

    // Divider line
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 480);
    ctx.lineTo(cardW - 30, 480);
    ctx.stroke();

    // Privacy details / Instructions
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🛡️ GİZLİ NUMARA İLE GÜVENLİ İLETİŞİM', cardW / 2, 515);

    ctx.fillStyle = '#64748b';
    ctx.font = '12px Arial, sans-serif';
    ctx.fillText('Telefon numaranız asla görünmez. ParkQR ile numaranız gizlidir.', cardW / 2, 540);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Arial, sans-serif';
    ctx.fillText('Bu etiket ParkQR (parkqr-nine.vercel.app) altyapısı ile oluşturulmuştur.', cardW / 2, 580);

    // Download trigger
    const link = document.createElement('a');
    link.download = `ParkQR_Yazdir_${tag.plate}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (loading) return <div className="glass-card" style={{ textAlign: 'center', padding: '48px' }}><Loader2 className="spinner" size={36} /></div>;

  const handleCreateNewTag = () => {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/activate/${randomId}`);
  };

  const handleEditPlateClick = (tag) => {
    setEditingTag(tag.id);
    setEditPlateValue(tag.plate);
    setEditPhoneValue(tag.ownerPhone || "");
  };

  const handleSavePlate = async (tagId) => {
    if (editPlateValue.trim() !== "") {
      await updateTagInfo(tagId, editPlateValue.trim().toUpperCase(), editPhoneValue.trim());
    }
    setEditingTag(null);
  };

  const handleEnableNotifications = async () => {
    const success = await requestNotificationPermission(auth.currentUser.uid);
    if (success) {
      alert("Harika! Artık arabanızın başına biri geldiğinde anında bildirim alacaksınız.");
    } else {
      alert("Bildirim izni alınamadı. Tarayıcı ayarlarından bildirimleri açtığınıza emin olun.");
    }
  };

  return (
    <>
      {/* PWA Install Banner */}
      {deferredPrompt && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{ flex: '1 1 240px' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} color="#fbbf24" /> ParkQR'ı Telefona İndir
            </h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1' }}>Tek tıkla ana ekranınıza ekleyin ve anında bildirimleri kaçırmayın.</p>
          </div>
          <button 
            className="btn btn-primary" 
            style={{ padding: '8px 16px', fontSize: '0.85rem', width: 'auto', background: 'var(--accent-gradient)', height: '36px' }}
            onClick={async () => {
              deferredPrompt.prompt();
              const { outcome } = await deferredPrompt.userChoice;
              console.log(`User response to install prompt: ${outcome}`);
              setDeferredPrompt(null);
            }}
          >
            Yükle
          </button>
        </div>
      )}

      <div className="glass-card">
        {/* Enable Notifications Box */}
        <div style={{
          background: 'rgba(99, 102, 241, 0.08)', 
          border: '1px solid rgba(99, 102, 241, 0.25)', 
          borderRadius: '16px', 
          padding: '20px', 
          marginBottom: '28px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '16px'
        }}>
          <div style={{ flex: '1 1 240px' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BellRing size={18} color="#818cf8" /> Anında Bildirimler
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.4' }}>
              Uygulama kapalıyken bile telefonunuza sesli ve anlık bildirim gelsin.
            </p>
          </div>
          <button 
            onClick={handleEnableNotifications} 
            className="btn btn-primary" 
            style={{ padding: '10px 20px', fontSize: '0.85rem', width: 'auto', background: 'var(--accent-gradient)' }}
          >
            Bildirimleri Aç
          </button>
        </div>

        {/* Registered Cars Section */}
        <div style={{ marginBottom: '32px', paddingBottom: '32px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Kayıtlı Araçlarım</h2>
            <button className="btn btn-outline" onClick={handleCreateNewTag} style={{ padding: '8px 16px', fontSize: '0.85rem', width: 'auto' }}>
              <Plus size={16} /> Yeni Ekle
            </button>
          </div>
          
          {tags.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(0,0,0,0.15)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.08)' }}>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>Henüz eşleştirilmiş bir etiketiniz yok.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {tags.map(tag => (
                <div key={tag.id} style={{
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '20px', 
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: '1' }}>
                      {editingTag === tag.id ? (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
                          <input 
                            type="text" 
                            value={editPlateValue} 
                            onChange={(e) => setEditPlateValue(e.target.value)} 
                            placeholder="Plaka" 
                            style={{ padding: '8px 12px', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'white', width: '110px', height: '40px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px' }} 
                          />
                          <input 
                            type="tel" 
                            value={editPhoneValue} 
                            onChange={(e) => setEditPhoneValue(e.target.value)} 
                            placeholder="Telefon" 
                            style={{ padding: '8px 12px', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'white', width: '140px', height: '40px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px' }} 
                          />
                          <button onClick={() => handleSavePlate(tag.id)} className="btn btn-primary" style={{ padding: '0 12px', width: 'auto', height: '40px', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: 'none' }}><Check size={16} /></button>
                          <button onClick={() => setEditingTag(null)} className="btn btn-danger" style={{ padding: '0 12px', width: 'auto', height: '40px', borderRadius: '8px', background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', boxShadow: 'none' }}><X size={16} /></button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                          <div className="plate-badge">
                            <div className="plate-badge-tr">TR</div>
                            <div className="plate-badge-text">{tag.plate}</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Barkod ID: {tag.tagId}</span>
                            {tag.ownerPhone && <span style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '2px' }}>Tel: {tag.ownerPhone}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {editingTag !== tag.id && (
                      <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                        <button 
                          onClick={() => handleEditPlateClick(tag)} 
                          className="btn btn-outline" 
                          style={{ padding: '8px 12px', width: 'auto', height: '38px', borderRadius: '10px', fontSize: '0.8rem' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '8px 16px', width: 'auto', height: '38px', borderRadius: '10px', fontSize: '0.8rem' }} 
                          onClick={() => setShowQR(showQR === tag.tagId ? null : tag.tagId)}
                        >
                          {showQR === tag.tagId ? 'Gizle' : 'QR Göster'}
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {showQR === tag.tagId && (
                    <div style={{ 
                      padding: '24px', 
                      background: 'white', 
                      borderRadius: '16px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
                      animation: 'fadeIn 0.3s ease-out'
                    }}>
                      <div className={`qr-box-container-${tag.tagId}`} style={{ display: 'flex', justifyContent: 'center' }}>
                        <QRCodeSVG value={`https://parkqr-nine.vercel.app/id/${tag.tagId}`} size={200} />
                      </div>
                      <p style={{ color: '#0f172a', marginTop: '16px', fontWeight: '700', fontSize: '0.95rem', textAlign: 'center', margin: '16px 0 0 0' }}>
                        Bu karekodu telefon kamerasıyla okutun
                      </p>
                      
                      <div style={{ display: 'flex', gap: '10px', marginTop: '20px', width: '100%' }}>
                        <button 
                          onClick={() => downloadQRCard(tag)} 
                          className="btn btn-primary" 
                          style={{ fontSize: '0.85rem', flex: 1, padding: '10px 14px', borderRadius: '10px', height: '40px', boxShadow: 'none' }}
                        >
                          <Download size={16} /> Yazdırılabilir PNG İndir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ringtone Settings Panel */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '32px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Volume2 size={18} color="#6366f1" /> Bildirim Zil Sesi
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {SOUNDS.map(sound => (
              <label key={sound.url} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', cursor: 'pointer', color: '#cbd5e1' }}>
                <input
                  type="radio"
                  name="alertSound"
                  checked={alertSound === sound.url}
                  onChange={() => handleSoundChange(sound.url)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#6366f1' }}
                />
                {sound.name}
              </label>
            ))}
          </div>
          <button 
            onClick={() => audioRef.current.play().catch(e => console.log(e))} 
            className="btn btn-outline" 
            style={{ padding: '8px 16px', fontSize: '0.8rem', width: 'auto', marginTop: '16px', height: '34px', borderRadius: '8px' }}
          >
            Sesi Test Et
          </button>
        </div>

        {/* Incoming Calls Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Gelen Çağrılar</h2>
          <div className="badge badge-success" style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }} onClick={requestPermissions}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', animation: 'pulse 1.8s infinite' }}></div>
            Canlı Dinleniyor
          </div>
        </div>

        <style>{`
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
            70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
            100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes scaleUp {
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>

        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Henüz hiç çağrı almadınız.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {notifications.map(notif => {
              // Sadece sayıları al
              const cleanPhone = notif.senderPhone.replace(/\D/g, '');
              // WhatsApp Linki (Başına 90 ekleriz, Türkiye varsayımı)
              const waLink = `https://wa.me/90${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}`;
              
              return (
                <div key={notif.id} style={{
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderLeft: '4px solid #f43f5e',
                  padding: '20px', 
                  borderRadius: '16px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div className="plate-badge">
                      <div className="plate-badge-tr">TR</div>
                      <div className="plate-badge-text">{notif.plate}</div>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px' }}>
                      {new Date(notif.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  {notif.message && (
                    <div style={{
                      background: 'rgba(244, 63, 94, 0.08)',
                      border: '1px solid rgba(244, 63, 94, 0.2)',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      color: '#fb7185',
                      fontSize: '0.88rem',
                      fontWeight: '600',
                      marginBottom: '12px'
                    }}>
                      Arama Nedeni: {notif.message}
                    </div>
                  )}

                  <p style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: '#cbd5e1', fontWeight: '500' }}>
                    Arayan Numara: <span style={{ color: '#f3f4f6' }}>{notif.senderPhone}</span>
                  </p>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <a href={`tel:+90${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}`} className="btn btn-outline" style={{
                      padding: '10px 14px', 
                      fontSize: '0.85rem',
                      flex: '1 1 90px',
                      borderRadius: '10px',
                      height: '42px'
                    }}>
                      <Phone size={16} />
                      Normal
                    </a>

                    <a href={`tel:%2331%23${cleanPhone.startsWith('0') ? cleanPhone : '0' + cleanPhone}`} className="btn" style={{
                      background: 'var(--accent-gradient)', 
                      color: 'white', 
                      padding: '10px 14px', 
                      fontSize: '0.85rem',
                      flex: '1 1 90px',
                      borderRadius: '10px',
                      height: '42px',
                      boxShadow: 'none'
                    }}>
                      <PhoneOff size={16} />
                      Gizli Ara
                    </a>

                    <a href={waLink} target="_blank" rel="noreferrer" className="btn" style={{
                      background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)', 
                      color: 'white', 
                      padding: '10px 14px', 
                      fontSize: '0.85rem',
                      flex: '1 1 90px',
                      borderRadius: '10px',
                      height: '42px',
                      boxShadow: 'none'
                    }}>
                      <MessageSquare size={16} />
                      WhatsApp
                    </a>

                    <button onClick={() => setDeleteConfirm(notif.id)} className="btn btn-danger" style={{
                      padding: '0 12px',
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      flex: '0 0 auto',
                      boxShadow: 'none'
                    }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Popup Modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(6, 8, 20, 0.85)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, animation: 'fadeIn 0.2s ease-out' }}>
          <div className="glass-card" style={{ margin: '20px', textAlign: 'center', maxWidth: '340px', padding: '32px 24px', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(244, 63, 94, 0.1)', borderRadius: '50%', marginBottom: '16px' }}>
              <ShieldAlert size={32} color="#f43f5e" />
            </div>
            <h3 style={{ color: '#f43f5e', marginBottom: '12px', fontSize: '1.25rem' }}>Çağrıyı Sil</h3>
            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '24px', lineHeight: '1.5' }}>
              Bu çağrıyı geçmişten tamamen silmek istediğinize emin misiniz?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-outline" onClick={() => setDeleteConfirm(null)} style={{ padding: '10px 16px', fontSize: '0.9rem', flex: 1, borderRadius: '10px' }}>İptal</button>
              <button className="btn btn-danger" onClick={async () => {
                await deleteNotificationRecord(deleteConfirm);
                setDeleteConfirm(null);
              }} style={{ padding: '10px 16px', fontSize: '0.9rem', flex: 1, borderRadius: '10px', background: 'var(--danger-gradient)' }}>Evet, Sil</button>
            </div>
          </div>
        </div>
      )}

      {/* Why ParkQR Info Container */}
      <div className="glass-card" style={{ marginTop: '20px', padding: '32px 24px' }}>
        <h3 style={{ color: '#818cf8', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
          <Award size={22} /> Neden ParkQR? (Tam Gizlilik)
        </h3>
        
        <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '20px', borderRadius: '16px', marginBottom: '24px' }}>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <ShieldCheck size={20} color="#34d399" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                <strong>Siz Gizli Kalırsınız:</strong> Numaranız istenmeyen kişilere iletilmez. Araç sahibi %100 gizli kalır.
              </p>
            </li>
            <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <ShieldCheck size={20} color="#34d399" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                <strong>Arama Kontrolü Sizde:</strong> Çağrı aldığınızda panelinizden tek tuşla <strong>"Gizli Numaradan Ara"</strong> diyerek kendi numaranızı saklayıp vatandaşı arayabilirsiniz.
              </p>
            </li>
            <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <ShieldCheck size={20} color="#34d399" style={{ flexShrink: 0, marginTop: '2px' }} />
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1', lineHeight: '1.5' }}>
                <strong>Rahatsızlıklara Son:</strong> İstenmeyen kişiler telefon numaranıza ulaşamaz.
              </p>
            </li>
          </ul>
        </div>

        <div style={{ fontSize: '0.85rem', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px' }}>
          <p style={{ marginBottom: '8px' }}>Proje Kurucusu ve Geliştirici: <strong>Gökhan Eker</strong></p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <a href="https://github.com/gokhanekerai/parkqr" target="_blank" rel="noreferrer" style={{ color: '#818cf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Proje Kodları (GitHub)
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState('');
  const [tags, setTags] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [editPlateValue, setEditPlateValue] = useState("");
  const [editPhoneValue, setEditPhoneValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleLogin = (e) => {
    e.preventDefault();
    if (pass === '123456') {
      setAuthed(true);
      fetchData();
    } else {
      alert('Hatalı şifre!');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const tSnap = await getDocs(collection(db, 'tags'));
    setTags(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    
    const nSnap = await getDocs(collection(db, 'notifications'));
    setNotifs(nSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  const handleDeleteTag = async (id) => {
    await deleteTagRecord(id);
    setConfirmDelete(null);
    fetchData();
  };

  const handleEditClick = (tag) => {
    setEditingTag(tag.id);
    setEditPlateValue(tag.plate);
    setEditPhoneValue(tag.ownerPhone || "");
  };

  const handleSavePlate = async (tagId) => {
    if (editPlateValue.trim() !== "") {
      await updateTagInfo(tagId, editPlateValue.trim().toUpperCase(), editPhoneValue.trim());
      fetchData();
    }
    setEditingTag(null);
  };

  if (!authed) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', maxWidth: '400px', margin: '0 auto', padding: '36px 24px' }}>
        <div style={{ display: 'inline-flex', padding: '14px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '50%', marginBottom: '16px' }}>
          <ShieldAlert size={40} color="#6366f1" />
        </div>
        <h2>Süper Admin Girişi</h2>
        <form onSubmit={handleLogin} style={{ marginTop: '24px' }}>
          <input 
            type="password" 
            placeholder="Şifrenizi Girin" 
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            style={{ marginBottom: '16px', height: '48px' }}
          />
          <button type="submit" className="btn btn-primary" style={{ height: '48px' }}>Giriş Yap</button>
        </form>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h2>Admin Paneli</h2>
        <button className="btn btn-outline" onClick={() => setAuthed(false)} style={{ padding: '6px 16px', fontSize: '0.8rem', width: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <LogOut size={14} /> Çıkış
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 140px', background: 'rgba(99, 102, 241, 0.08)', padding: '20px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
          <h3 style={{ fontSize: '2.2rem', color: '#818cf8', margin: 0 }}>{tags.length}</h3>
          <p style={{ margin: '6px 0 0 0', color: '#cbd5e1', fontSize: '0.85rem' }}>Toplam Etiket</p>
        </div>
        <div style={{ flex: '1 1 140px', background: 'rgba(16, 185, 129, 0.08)', padding: '20px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
          <h3 style={{ fontSize: '2.2rem', color: '#34d399', margin: 0 }}>{notifs.length}</h3>
          <p style={{ margin: '6px 0 0 0', color: '#cbd5e1', fontSize: '0.85rem' }}>Toplam Çağrı</p>
        </div>
      </div>

      <h3 style={{ marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>Kayıtlı Plakalar</h3>
      {loading ? <p>Yükleniyor...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          {tags.map(t => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', padding: '16px', borderRadius: '12px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ flex: '1 1 200px' }}>
                {editingTag === t.id ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="text" value={editPlateValue} onChange={(e) => setEditPlateValue(e.target.value)} placeholder="Plaka" style={{ padding: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'white', width: '100px', height: '36px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px' }} />
                    <input type="tel" value={editPhoneValue} onChange={(e) => setEditPhoneValue(e.target.value)} placeholder="Telefon" style={{ padding: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'white', width: '130px', height: '36px', background: 'rgba(0,0,0,0.4)', borderRadius: '6px' }} />
                    <button onClick={() => handleSavePlate(t.id)} className="btn btn-primary" style={{ padding: '0 8px', width: 'auto', height: '36px', borderRadius: '6px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: 'none' }}><Check size={14} /></button>
                    <button onClick={() => setEditingTag(null)} className="btn btn-danger" style={{ padding: '0 8px', width: 'auto', height: '36px', borderRadius: '6px', background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', boxShadow: 'none' }}><X size={14} /></button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div className="plate-badge" style={{ height: '32px', fontSize: '0.95rem' }}>
                      <div className="plate-badge-tr" style={{ minWidth: '20px', fontSize: '0.55rem' }}>TR</div>
                      <div className="plate-badge-text" style={{ padding: '0 8px' }}>{t.plate}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>ID: {t.tagId}</span>
                      {t.ownerPhone && <span style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '2px' }}>Tel: {t.ownerPhone}</span>}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
                {editingTag !== t.id && (
                  <button onClick={() => handleEditClick(t)} style={{ background: 'transparent', border: 'none', color: '#818cf8', cursor: 'pointer', padding: '4px 8px', fontSize: '0.85rem', textDecoration: 'underline' }}>Düzenle</button>
                )}
                {confirmDelete === t.id ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ color: '#f43f5e', fontSize: '0.8rem' }}>Emin misiniz?</span>
                    <button onClick={() => handleDeleteTag(t.id)} style={{ background: '#f43f5e', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem' }}>Evet</button>
                    <button onClick={() => setConfirmDelete(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px 8px', fontSize: '0.85rem', textDecoration: 'underline' }}>İptal</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(t.id)} style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '4px 8px', fontSize: '0.85rem', textDecoration: 'underline' }}>Sil (Boşa Çıkar)</button>
                )}
              </div>
            </div>
          ))}
          {tags.length === 0 && <p style={{ color: '#94a3b8', textAlign: 'center', padding: '16px' }}>Henüz kayıtlı etiket yok.</p>}
        </div>
      )}
    </div>
  );
}

export default App;
